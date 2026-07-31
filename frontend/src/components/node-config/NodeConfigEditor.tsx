import {
    useCallback,
    useMemo,
    useState,
    useRef,
    useEffect,
    type DragEvent,
} from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import {
    ReactFlow,
    type Node,
    type Edge,
    type OnConnect,
    type Connection,
    useNodesState,
    useEdgesState,
    addEdge,
    Background,
    Controls,
    MiniMap,
    BackgroundVariant,
    SelectionMode,
    type ReactFlowInstance,
    type IsValidConnection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { nodeTypes } from "./nodes";
import { NodePalette, getNodeDefaults } from "./NodePalette";
import { NodeSettingsPanel } from "./NodeSettingsPanel";
import { NodeConfigToolbar } from "./NodeConfigToolbar";
import { getInputType, getOutputType } from "./nodes/socketTypes";
import type { NodeConfigGraph, NodeTypeDefinition } from "@/types/node-config";
import {
    useNodeTypes,
    useConfigByKey,
    useUpsertConfigByKey,
    usePreviewConfig,
} from "@/hooks/node-config/useNodeConfigs";
import { toast } from "sonner";
import { Loader2, Maximize2 } from "lucide-react";
import { useOutletLayout, useOutletFullScreen } from "@/hooks/useOutletLayout";
import { useTheme } from "@/hooks/useTheme";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { NodeConfigGraphProvider } from "@/contexts/NodeConfigGraphContext";

let nodeIdCounter = 0;
const generateId = () => `node_${++nodeIdCounter}_${Date.now()}`;
const edgeIdCounter = () =>
    `edge_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const SNAP_GRID: [number, number] = [10, 10];

function toFlowNodes(
    configNodes: NodeConfigGraph["nodes"],
    definitions: NodeTypeDefinition[],
): Node[] {
    return (configNodes || []).map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: {
            label:
                n.settings?.label ||
                definitions.find((d) => d.type === n.type)?.label ||
                n.type,
            ...n.settings,
        } as Record<string, unknown>,
    }));
}

function toFlowEdges(configEdges: NodeConfigGraph["edges"]): Edge[] {
    return (configEdges || []).map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        type: "default",
        animated: true,
        style: { stroke: "hsl(215 20% 55% / 0.6)", strokeWidth: 2 },
    }));
}

function fromFlow(nodes: Node[], edges: Edge[]): NodeConfigGraph {
    return {
        nodes: nodes.map((n) => ({
            id: n.id,
            type: n.type ?? "",
            settings: n.data as Record<string, unknown>,
            position: n.position,
        })),
        edges: edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle ?? undefined,
            targetHandle: e.targetHandle ?? undefined,
        })),
    };
}

interface NodeConfigEditorProps {
    configKey?: string;
    scopeLabel?: string;
    maximized?: boolean;
    alwaysMaximized?: boolean;
    showControls?: boolean;
    showMinimap?: boolean;
    showNodeTypesSidebar?: boolean;
    previewOnly?: boolean;
    config?: NodeConfigGraph;
}

export function NodeConfigEditor({
    configKey = "alerts",
    scopeLabel = "Global",
    maximized: controlledMaximized,
    alwaysMaximized = false,
    showControls = true,
    showMinimap = true,
    showNodeTypesSidebar = true,
    previewOnly = false,
    config: externalConfig,
}: NodeConfigEditorProps) {
    const { data: definitions = [], isLoading: defsLoading } = useNodeTypes();
    const shouldFetch = !externalConfig && !!configKey;
    const { data: savedConfig, isLoading: configLoading } =
        useConfigByKey(shouldFetch ? configKey : null);
    const upsertMutation = useUpsertConfigByKey();
    const previewMutation = usePreviewConfig();
    const { theme } = useTheme();
    const { portalRef } = useOutletLayout();

    const effectiveConfig = useMemo(() => {
        if (externalConfig) return { config: externalConfig, name: "" };
        return savedConfig;
    }, [externalConfig, savedConfig]);

    const [searchParams, setSearchParams] = useSearchParams();
    const internalMaximized = searchParams.get("editor") === "maximized";
    const setInternalMaximized = useCallback(
        (value: boolean | ((prev: boolean) => boolean)) => {
            setSearchParams(
                (prev) => {
                    if (typeof value === "function") {
                        value = value(prev.get("editor") === "maximized");
                    }
                    if (value) {
                        prev.set("editor", "maximized");
                    } else {
                        prev.delete("editor");
                    }
                    return prev;
                },
                { replace: true },
            );
        },
        [setSearchParams],
    );
    const isOutletMaximized =
        !previewOnly && (alwaysMaximized || (controlledMaximized !== undefined && controlledMaximized));
    const isMaximized = !previewOnly && (isOutletMaximized || internalMaximized);

    useOutletFullScreen(isOutletMaximized);

    useEffect(() => {
        if (internalMaximized) {
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = "";
            };
        }
    }, [internalMaximized]);

    const effectiveShowControls = isMaximized || showControls;
    const effectiveShowMinimap = isMaximized || showMinimap;
    const effectiveShowNodeTypesSidebar = isMaximized || showNodeTypesSidebar;

    const [portalContainer, setPortalContainer] =
        useState<HTMLDivElement | null>(null);
    useEffect(() => {
        setPortalContainer(portalRef.current);
    }, [portalRef]);

    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [hydrated, setHydrated] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [compiledPreview, setCompiledPreview] = useState<unknown>(null);
    const savedSnapshotRef = useRef<string>("");

    const initialNodes = useMemo(
        () =>
            effectiveConfig
                ? toFlowNodes(effectiveConfig.config.nodes, definitions)
                : [],
        [effectiveConfig, definitions],
    );
    const initialEdges = useMemo(
        () => (effectiveConfig ? toFlowEdges(effectiveConfig.config.edges) : []),
        [effectiveConfig],
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
    const nodesRef = useRef(nodes);
    const draggingNodeRef = useRef(false);
    useEffect(() => {
        nodesRef.current = nodes;
    });
    const edgesRef = useRef(edges);
    useEffect(() => {
        edgesRef.current = edges;
    });

    // ── Undo / Redo ────────────────────────────────────────────
    const historyRef = useRef<{ nodes: Node[]; edges: Edge[]; label: string }[]>([]);
    const historyIndexRef = useRef(-1);
    const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const suppressHistoryRef = useRef(false);
    const pendingLabelRef = useRef<string>("");
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [historyLabels, setHistoryLabels] = useState<string[]>([]);
    const [historyIdx, setHistoryIdx] = useState(-1);

    const syncHistoryButtons = useCallback(() => {
        setCanUndo(historyIndexRef.current > 0);
        setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
        setHistoryLabels(historyRef.current.map((e) => e.label));
        setHistoryIdx(historyIndexRef.current);
    }, []);

    const pushSnapshot = useCallback((label?: string) => {
        if (suppressHistoryRef.current) return;
        if (label) pendingLabelRef.current = label;
        if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
        pushTimerRef.current = setTimeout(() => {
            const snapshot = {
                nodes: JSON.parse(JSON.stringify(nodesRef.current)),
                edges: JSON.parse(JSON.stringify(edgesRef.current)),
                label: pendingLabelRef.current || "Edit",
            };
            pendingLabelRef.current = "";
            const idx = historyIndexRef.current;
            const stack = historyRef.current;
            const last = stack[idx];
            if (last && JSON.stringify(last.nodes) === JSON.stringify(snapshot.nodes) && JSON.stringify(last.edges) === JSON.stringify(snapshot.edges)) return;
            historyRef.current = [...stack.slice(0, idx + 1), snapshot];
            historyIndexRef.current = historyRef.current.length - 1;
            syncHistoryButtons();
        }, 300);
    }, [syncHistoryButtons]);

    const jumpToHistory = useCallback((targetIdx: number) => {
        const stack = historyRef.current;
        if (targetIdx < 0 || targetIdx >= stack.length || targetIdx === historyIndexRef.current) return;
        suppressHistoryRef.current = true;
        const target = stack[targetIdx];
        setNodes(target.nodes);
        setEdges(target.edges);
        historyIndexRef.current = targetIdx;
        syncHistoryButtons();
        requestAnimationFrame(() => { suppressHistoryRef.current = false; });
    }, [setNodes, setEdges, syncHistoryButtons]);

    const undo = useCallback(() => jumpToHistory(historyIndexRef.current - 1), [jumpToHistory]);
    const redo = useCallback(() => jumpToHistory(historyIndexRef.current + 1), [jumpToHistory]);

    const handleNodesChange = useCallback((changes: Parameters<typeof onNodesChange>[0]) => {
        const hasDragStart = changes.some((c) => c.type === 'position' && c.dragging);
        const hasDragEnd = changes.some((c) => c.type === 'position' && !c.dragging && c.dragging !== undefined);
        if (hasDragStart) draggingNodeRef.current = true;
        onNodesChange(changes);
        if (hasDragEnd && draggingNodeRef.current) {
            draggingNodeRef.current = false;
            pushSnapshot("Move node");
        }
    }, [onNodesChange, pushSnapshot]);

    const selectAll = useCallback(() => {
        setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
    }, [setNodes]);

    // ── Right-drag selection box ──────────────────────────────
    const [selBox, setSelBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
    const rightDragRef = useRef<{ startX: number; startY: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const onContextMenu = useCallback((e: React.MouseEvent) => {
        if (rightDragRef.current) e.preventDefault();
    }, []);

    const onPaneMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button === 2) {
            const target = e.target as HTMLElement;
            if (!target.closest(".react-flow__pane")) return;
            e.preventDefault();
            rightDragRef.current = { startX: e.clientX, startY: e.clientY };
            setSelBox({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
        }
    }, []);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!rightDragRef.current) return;
            const { startX, startY } = rightDragRef.current;
            const x = Math.min(startX, e.clientX);
            const y = Math.min(startY, e.clientY);
            const w = Math.abs(e.clientX - startX);
            const h = Math.abs(e.clientY - startY);
            setSelBox({ x, y, w, h });
        };
        const onUp = (e: MouseEvent) => {
            if (!rightDragRef.current) return;
            const { startX, startY } = rightDragRef.current;
            rightDragRef.current = null;

            const w = Math.abs(e.clientX - startX);
            const h = Math.abs(e.clientY - startY);

            if (w > 5 && h > 5 && reactFlowInstance.current) {
                const topLeft = reactFlowInstance.current.screenToFlowPosition({ x: Math.min(startX, e.clientX), y: Math.min(startY, e.clientY) });
                const bottomRight = reactFlowInstance.current.screenToFlowPosition({ x: Math.max(startX, e.clientX), y: Math.max(startY, e.clientY) });

                setNodes((nds) =>
                    nds.map((n) => {
                        const nx = n.position.x;
                        const ny = n.position.y;
                        const inBox = nx >= topLeft.x && nx <= bottomRight.x && ny >= topLeft.y && ny <= bottomRight.y;
                        return { ...n, selected: inBox };
                    }),
                );
            }

            setSelBox(null);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
    }, [setNodes]);

    // ── Keyboard shortcuts ────────────────────────────────────
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName;
            const isInput = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable;

            const key = e.key.toLowerCase();
            if ((e.ctrlKey || e.metaKey) && key === "z" && !e.shiftKey) {
                e.preventDefault();
                undo();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && key === "z" && e.shiftKey) {
                e.preventDefault();
                redo();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && key === "y") {
                e.preventDefault();
                redo();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key === "a" && !isInput) {
                e.preventDefault();
                selectAll();
                return;
            }
            if (e.key === "Delete" || e.key === "Backspace") {
                if (isInput) return;
                const selectedNodes = nodesRef.current.filter((n) => n.selected);
                const selectedEdges = edgesRef.current.filter((e) => e.selected);
                if (selectedNodes.length === 0 && selectedEdges.length === 0) return;
                e.preventDefault();
                const ids = new Set(selectedNodes.map((n) => n.id));
                suppressHistoryRef.current = true;
                setNodes((nds) => nds.filter((n) => !ids.has(n.id)));
                setEdges((eds) => eds.filter((e) => !ids.has(e.source) && !ids.has(e.target) && !e.selected));
                setSelectedNode(null);
                requestAnimationFrame(() => { suppressHistoryRef.current = false; pushSnapshot("Delete"); });
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [undo, redo, selectAll, setNodes, setEdges, pushSnapshot]);

    const [sidebarWidth, setSidebarWidth] = useState(192);
    const isDraggingSidebar = useRef(false);
    const dragStartX = useRef(0);
    const dragStartWidth = useRef(0);

    const onSidebarDragStart = useCallback(
        (e: React.MouseEvent) => {
            isDraggingSidebar.current = true;
            dragStartX.current = e.clientX;
            dragStartWidth.current = sidebarWidth;
            e.preventDefault();
        },
        [sidebarWidth],
    );

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!isDraggingSidebar.current) return;
            const delta = e.clientX - dragStartX.current;
            setSidebarWidth(
                Math.max(160, Math.min(480, dragStartWidth.current + delta)),
            );
        };
        const onUp = () => {
            isDraggingSidebar.current = false;
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        };
    }, []);

    useEffect(() => {
        setHydrated(false);
    }, [configKey]);

    useEffect(() => {
        if (effectiveConfig && !hydrated) {
            const flowNodes = toFlowNodes(
                effectiveConfig.config.nodes,
                definitions,
            );
            const flowEdges = toFlowEdges(effectiveConfig.config.edges);
            setNodes(flowNodes);
            setEdges(flowEdges);
            savedSnapshotRef.current = JSON.stringify({
                nodes: flowNodes,
                edges: flowEdges,
            });
            historyRef.current = [{ nodes: flowNodes, edges: flowEdges, label: "Load config" }];
            historyIndexRef.current = 0;
            syncHistoryButtons();
            setHydrated(true);
        }
    }, [effectiveConfig, definitions, hydrated, setNodes, setEdges]);

    const onConnect: OnConnect = useCallback(
        (connection: Connection) => {
            const sourceNode = nodes.find((n) => n.id === connection.source);
            const targetNode = nodes.find((n) => n.id === connection.target);
            if (!sourceNode || !targetNode) return;
            if (sourceNode.id === targetNode.id) return;

            setEdges((eds) =>
                addEdge(
                    {
                        ...connection,
                        id: edgeIdCounter(),
                        type: "default",
                        animated: true,
                        style: {
                            stroke: "hsl(215 20% 55% / 0.45)",
                            strokeWidth: 1.5,
                        },
                    },
                    eds,
                ),
            );
            pushSnapshot("Connect nodes");
        },
        [nodes, setEdges, pushSnapshot],
    );

    const isValidConnection: IsValidConnection = useCallback(
        (edgeOrConnection: Edge | Connection) => {
            const source = edgeOrConnection.source;
            const target = edgeOrConnection.target;
            const sourceHandle = edgeOrConnection.sourceHandle;
            const targetHandle = edgeOrConnection.targetHandle;
            if (!source || !target || !sourceHandle || !targetHandle)
                return false;
            const sourceDef = getOutputType(
                nodesRef.current.find((n) => n.id === source)?.type || "",
                sourceHandle ?? undefined,
            );
            const targetDef = getInputType(
                nodesRef.current.find((n) => n.id === target)?.type || "",
                targetHandle,
            );
            if (!sourceDef || !targetDef) return false;
            if (targetDef.type === "any") return true;
            return sourceDef.type === targetDef.type;
        },
        [],
    );

    const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
        setSelectedNode(node);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
    }, []);

    const updateNodeSettings = useCallback(
        (nodeId: string, settings: Record<string, unknown>) => {
            setNodes((nds) =>
                nds.map((n) => {
                    if (n.id === nodeId) {
                        return { ...n, data: { ...n.data, ...settings } };
                    }
                    return n;
                }),
            );
            setSelectedNode((prev) =>
                prev?.id === nodeId
                    ? { ...prev, data: { ...prev.data, ...settings } }
                    : prev,
            );
            pushSnapshot("Update settings");
        },
        [setNodes, pushSnapshot],
    );

    const deleteNode = useCallback(
        (nodeId: string) => {
            setNodes((nds) => nds.filter((n) => n.id !== nodeId));
            setEdges((eds) =>
                eds.filter((e) => e.source !== nodeId && e.target !== nodeId),
            );
            setSelectedNode((prev) => (prev?.id === nodeId ? null : prev));
            pushSnapshot("Delete node");
        },
        [setNodes, setEdges, pushSnapshot],
    );

    const CAPABILITY_SETTINGS: Record<string, Record<string, unknown>> = {
        repeat: {
            repeat_interval: '10000',
            repeat_max_repeats: -1,
        },
    };

    const TIME_NODE_TYPES = new Set(['sustained', 'check_after']);
    const capHighlightRef = useRef<string | null>(null);

    const clearCapHighlight = useCallback(() => {
        if (capHighlightRef.current) {
            const el = document.querySelector(`.react-flow__node[data-id="${capHighlightRef.current}"]`);
            if (el) {
                const inner = el.querySelector('.react-flow__node-content') || el.firstElementChild;
                if (inner) (inner as HTMLElement).style.boxShadow = '';
                el.removeAttribute('data-cap-target');
            }
            capHighlightRef.current = null;
        }
    }, []);

    const findNodeAtCursor = useCallback(
        (clientX: number, clientY: number): Node | null => {
            const elements = document.elementsFromPoint(clientX, clientY);
            for (const el of elements) {
                const nodeEl = el.closest('.react-flow__node[data-id]');
                if (!nodeEl) continue;
                const nodeId = nodeEl.getAttribute('data-id');
                const node = nodes.find((n) => n.id === nodeId);
                if (node && TIME_NODE_TYPES.has(node.type || '')) {
                    return node;
                }
            }
            return null;
        },
        [nodes],
    );

    const onDragOver = useCallback(
        (event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            const hasCap = event.dataTransfer.types.includes('application/capability');
            event.dataTransfer.dropEffect = hasCap ? 'copy' : 'move';

            if (!hasCap) {
                clearCapHighlight();
                return;
            }

            const node = findNodeAtCursor(event.clientX, event.clientY);
            const newId = node?.id || null;

            if (newId !== capHighlightRef.current) {
                clearCapHighlight();
                if (newId) {
                    const el = document.querySelector(`.react-flow__node[data-id="${newId}"]`);
                    if (el) {
                        el.setAttribute('data-cap-target', 'true');
                        const inner = el.querySelector('.react-flow__node-content') || el.firstElementChild;
                        if (inner) {
                            const computed = getComputedStyle(inner as HTMLElement);
                            const existing = computed.boxShadow;
                            const borderMatch = existing.match(/0 0 0 1px\s+(#[0-9a-fA-F]+)/);
                            const color = borderMatch?.[1] || '#10b981';
                            (inner as HTMLElement).style.boxShadow = `0 0 0 3px ${color}, 0 0 12px 4px ${color}40`;
                        }
                    }
                    capHighlightRef.current = newId;
                }
            }
        },
        [findNodeAtCursor, clearCapHighlight],
    );

    const onDragLeave = useCallback(
        (event: DragEvent<HTMLDivElement>) => {
            const related = event.relatedTarget as HTMLElement | null;
            if (related && event.currentTarget.contains(related)) return;
            clearCapHighlight();
        },
        [clearCapHighlight],
    );

    const CAPABILITY_EXISTS: Record<string, (data: Record<string, unknown>) => boolean> = {
        repeat: (data) => {
            const ri = parseInt((data.repeat_interval as string) || '0', 10) || 0;
            return ri > 0;
        },
    };

    const applyCapability = useCallback(
        (capId: string, targetNodeId: string | null) => {
            if (!targetNodeId) {
                toast.error("Drop onto a time node to apply");
                return;
            }
            const node = nodes.find((n) => n.id === targetNodeId);
            if (!node || !TIME_NODE_TYPES.has(node.type || '')) {
                toast.error("Repeat can only be applied to time nodes");
                return;
            }
            const existsCheck = CAPABILITY_EXISTS[capId];
            if (existsCheck && existsCheck(node.data as Record<string, unknown>)) {
                toast.error(`This node already has the ${capId} capability`);
                return;
            }
            const capSettings = CAPABILITY_SETTINGS[capId] || {};
            setNodes((nds) =>
                nds.map((n) =>
                    n.id === targetNodeId
                        ? { ...n, data: { ...n.data, ...capSettings } }
                        : n,
                ),
            );
            setSelectedNode((prev) =>
                prev?.id === targetNodeId
                    ? { ...prev, data: { ...prev.data, ...capSettings } }
                    : prev,
            );
            toast.success(`Applied ${capId} to ${node.data.label || node.type}`);
            pushSnapshot("Apply capability");
        },
        [nodes, setNodes, setSelectedNode, pushSnapshot],
    );

    const onDrop = useCallback(
        (event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            clearCapHighlight();

            const capId = event.dataTransfer.getData("application/capability");
            if (capId) {
                const node = findNodeAtCursor(event.clientX, event.clientY);
                applyCapability(capId, node?.id || null);
                return;
            }

            const type = event.dataTransfer.getData("application/reactflow");
            if (!type || !reactFlowInstance.current) return;

            const position = reactFlowInstance.current.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            const defaults = getNodeDefaults(type, definitions);
            const newNode: Node = {
                id: generateId(),
                type,
                position,
                data: defaults,
            };
            setNodes((nds) => [...nds, newNode]);
            pushSnapshot("Add node");
        },
        [definitions, setNodes, findNodeAtCursor, applyCapability, clearCapHighlight, pushSnapshot],
    );

    const addNodeByClick = useCallback(
        (type: string) => {
            const position = {
                x: 100 + Math.random() * 300,
                y: 100 + Math.random() * 200,
            };
            const defaults = getNodeDefaults(type, definitions);
            const newNode: Node = {
                id: generateId(),
                type,
                position,
                data: defaults,
            };
            setNodes((nds) => [...nds, newNode]);
            pushSnapshot("Add node");
        },
        [definitions, setNodes, pushSnapshot],
    );

    const selectedNodeDef = useMemo(() => {
        if (!selectedNode) return null;
        return definitions.find((d) => d.type === selectedNode.type) || null;
    }, [selectedNode, definitions]);

    const displayName = useMemo(() => {
        if (configKey === "alerts") return "Global Alert Config";
        if (configKey.startsWith("client_"))
            return `${scopeLabel} Client Alert Config`;
        if (configKey.startsWith("server_"))
            return `${scopeLabel} Server Alert Config`;
        return `${scopeLabel} Alert Config`;
    }, [configKey, scopeLabel]);

    const handleSave = useCallback(async () => {
        const graph = fromFlow(nodes, edges);
        try {
            await upsertMutation.mutateAsync({
                slug: configKey,
                data: { name: displayName, config: graph },
            });
            savedSnapshotRef.current = JSON.stringify({ nodes, edges });
            toast.success("Config saved");
        } catch {
            toast.error("Failed to save config");
        }
    }, [nodes, edges, displayName, configKey, upsertMutation]);

    const handlePreview = useCallback(async () => {
        const graph = fromFlow(nodes, edges);
        try {
            const result = await previewMutation.mutateAsync({
                config: graph,
            });
            setCompiledPreview(result);
            setPreviewOpen(true);
        } catch {
            toast.error("Failed to compile config");
        }
    }, [nodes, edges, previewMutation]);

    const previewNodes = useMemo(
        () => toFlowNodes(effectiveConfig?.config.nodes ?? [], definitions),
        [effectiveConfig, definitions],
    );
    const previewEdges = useMemo(
        () => toFlowEdges(effectiveConfig?.config.edges ?? []),
        [effectiveConfig],
    );
    const isEmpty = previewNodes.length === 0 && previewEdges.length === 0;

    const isDirty = useMemo(() => {
        if (!hydrated) return false;
        return savedSnapshotRef.current !== JSON.stringify({ nodes, edges });
    }, [hydrated, nodes, edges]);

    if (defsLoading || (!externalConfig && configLoading)) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2
                    size={24}
                    className="animate-spin text-muted-foreground"
                />
            </div>
        );
    }

    const editorContent = (
        <NodeConfigGraphProvider isPreview={false}>
            <style>{`
                .react-flow__edge.selected .react-flow__edge-path {
                    stroke: hsl(215 80% 55%) !important;
                    stroke-width: 3 !important;
                }
                .react-flow__edge:hover:not(.selected) .react-flow__edge-path {
                    stroke: hsl(215 80% 55% / 0.5) !important;
                    stroke-width: 3 !important;
                }
                .react-flow__edge-interaction {
                    stroke-width: 20 !important;
                }
            `}</style>
            <div className={`${previewOnly ? "h-full" : "flex-1"} flex flex-col min-h-0`}>
                <NodeConfigToolbar
                    name={displayName}
                    isSaving={upsertMutation.isPending}
                    isDirty={isDirty}
                    onSave={handleSave}
                    onPreview={handlePreview}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onUndo={undo}
                    onRedo={redo}
                    historyLabels={historyLabels}
                    historyIndex={historyIdx}
                    onJumpToHistory={jumpToHistory}
                    readOnly
                    onClose={
                        alwaysMaximized
                            ? undefined
                            : () => setInternalMaximized(false)
                    }
                />
                <div className="flex flex-1 min-h-0">
                    {effectiveShowNodeTypesSidebar && (
                        <div
                            style={{
                                width: sidebarWidth,
                                minWidth: sidebarWidth,
                            }}
                            className="relative shrink-0 bg-card"
                        >
                            <NodePalette
                                nodeTypes={definitions}
                                onAddNode={addNodeByClick}
                            />
                            <div
                                onMouseDown={onSidebarDragStart}
                                className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-border/60 transition-colors z-10"
                            />
                        </div>
                    )}
                    <div
                        ref={containerRef}
                        className="flex-1 relative"
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        onContextMenu={onContextMenu}
                        onMouseDown={onPaneMouseDown}
                    >
                        <ReactFlow
                            colorMode={theme}
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={handleNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            isValidConnection={isValidConnection}
                            onNodeClick={onNodeClick}
                            onPaneClick={onPaneClick}
                            nodeTypes={nodeTypes}
                            fitView
                            minZoom={0.3}
                            deleteKeyCode={null}
                            multiSelectionKeyCode={["Meta", "Control", "Shift"]}
                            selectionMode={SelectionMode.Partial}
                            selectionOnDrag
                            snapToGrid
                            snapGrid={SNAP_GRID}
                            onInit={(instance) => {
                                reactFlowInstance.current = instance;
                            }}
                        >
                            <Background
                                variant={BackgroundVariant.Dots}
                                gap={10}
                                size={1}
                                className="bg-background"
                            />
                            {effectiveShowControls && (
                                <Controls className="bg-card border border-border/40 rounded-lg" />
                            )}
                            {effectiveShowMinimap && (
                                <MiniMap
                                    nodeColor="transparent"
                                    nodeStrokeColor={(node) => {
                                        const cat = definitions.find(
                                            (d) => d.type === node.type,
                                        )?.category;
                                        const colors: Record<string, string> = {
                                            metric: "#3b82f6",
                                            condition: "#f59e0b",
                                            logic: "#8b5cf6",
                                            time: "#10b981",
                                            action: "#ef4444",
                                        };
                                        return colors[cat || ""] || "#6b7280";
                                    }}
                                    nodeStrokeWidth={10}
                                    nodeBorderRadius={20}
                                    maskColor="rgba(0,0,0,0.3)"
                                    pannable
                                    zoomable
                                    className="bg-card! border! border-border! rounded-lg!"
                                />
                            )}
                        </ReactFlow>
                        {selBox && selBox.w > 0 && (
                            <div
                                className="absolute pointer-events-none border border-dashed border-primary/60 bg-primary/10 rounded-sm z-50"
                                style={{
                                    left: selBox.x - (containerRef.current?.getBoundingClientRect().left ?? 0),
                                    top: selBox.y - (containerRef.current?.getBoundingClientRect().top ?? 0),
                                    width: selBox.w,
                                    height: selBox.h,
                                }}
                            />
                        )}
                        <div
                            className={`absolute top-4 right-4 z-10 transition-opacity duration-200 ${selectedNode ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                        >
                            <NodeSettingsPanel
                                node={selectedNode}
                                nodeTypeDef={selectedNodeDef}
                                onUpdate={updateNodeSettings}
                                onDelete={deleteNode}
                                onClose={() => setSelectedNode(null)}
                            />
                        </div>
                    </div>
                </div>

                <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                    <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Compiled Config</DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 overflow-auto">
                            <pre className="text-xs font-mono text-foreground bg-background border border-border/40 rounded-lg p-4 whitespace-pre-wrap">
                                {compiledPreview
                                    ? JSON.stringify(compiledPreview, null, 2)
                                    : "No preview available"}
                            </pre>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </NodeConfigGraphProvider>
    );

    if (!isOutletMaximized && !internalMaximized) {
        return (
            <NodeConfigGraphProvider isPreview={true}>
                <div className={`relative w-full rounded-xl bg-background overflow-hidden ${previewOnly ? "h-full" : ""}`}>
                    <div className={`w-full ${previewOnly ? "h-full" : "h-70"} preview-nodes-disabled`}>
                        {isEmpty ? (
                            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                                No alerts configured. Maximize to edit.
                            </div>
                        ) : (
                            <ReactFlow
                                nodes={previewNodes}
                                edges={previewEdges}
                                nodeTypes={nodeTypes}
                                fitView
                                minZoom={0.3}
                                proOptions={{ hideAttribution: true }}
                                nodesDraggable={false}
                                nodesConnectable={false}
                                elementsSelectable={false}
                                panOnDrag
                                zoomOnScroll
                                zoomOnPinch
                            >
                                <Background
                                    variant={BackgroundVariant.Dots}
                                    gap={10}
                                    size={1}
                                    className="bg-background"
                                />
                        </ReactFlow>
                        )}
                    </div>
                    {!previewOnly && (
                        <button
                            onClick={() => setInternalMaximized(true)}
                            className="absolute top-2 right-2 p-1.5 rounded-md bg-card/80 backdrop-blur border border-border/40 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                            title="Open full editor"
                        >
                            <Maximize2 size={14} />
                        </button>
                    )}
                </div>
            </NodeConfigGraphProvider>
        );
    }

    if (isOutletMaximized) {
        return editorContent;
    }

    if (!portalContainer) return null;
    return createPortal(editorContent, portalContainer);
}
