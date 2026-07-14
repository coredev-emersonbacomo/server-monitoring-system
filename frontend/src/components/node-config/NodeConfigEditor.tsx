import {
    useCallback,
    useMemo,
    useState,
    useRef,
    useEffect,
    type DragEvent,
} from "react";
import {
    ReactFlow,
    type Node,
    type Edge,
    type OnNodesChange,
    type OnEdgesChange,
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
import { Loader2 } from "lucide-react";
import { useOutletFullScreen } from "@/hooks/useOutletLayout";
import { useTheme } from "@/hooks/useTheme";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

let nodeIdCounter = 0;
const generateId = () => `node_${++nodeIdCounter}_${Date.now()}`;
const edgeIdCounter = () =>
    `edge_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

function convertToFlowNodes(
    config: NodeConfigGraph,
    definitions: NodeTypeDefinition[],
): Node[] {
    return (config?.nodes || []).map((n) => ({
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

function convertToFlowEdges(config: NodeConfigGraph): Edge[] {
    return (config?.edges || []).map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        type: "smoothstep",
        animated: true,
        style: { stroke: "hsl(215 20% 55% / 0.6)", strokeWidth: 2 },
    }));
}

function convertFromFlow(nodes: Node[], edges: Edge[]): NodeConfigGraph {
    return {
        nodes: nodes.map((n) => ({
            id: n.id,
            type: n.type,
            settings: n.data as Record<string, unknown>,
            position: n.position,
        })),
        edges: edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
        })),
    };
}

interface NodeConfigEditorProps {
    configKey: string;
    defaultName?: string;
}

export function NodeConfigEditor({
    configKey,
    defaultName = "Untitled Config",
}: NodeConfigEditorProps) {
    const { data: definitions = [], isLoading: defsLoading } = useNodeTypes();
    const { data: savedConfig, isLoading: configLoading } =
        useConfigByKey(configKey);
    const upsertMutation = useUpsertConfigByKey();
    const previewMutation = usePreviewConfig();
    useOutletFullScreen(true);
    const { theme } = useTheme();

    const [name, setName] = useState(defaultName);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [hydrated, setHydrated] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [compiledPreview, setCompiledPreview] = useState<unknown>(null);

    const initialNodes = useMemo(
        () =>
            savedConfig
                ? convertToFlowNodes(savedConfig.config, definitions)
                : [],
        [savedConfig, definitions],
    );
    const initialEdges = useMemo(
        () => (savedConfig ? convertToFlowEdges(savedConfig.config) : []),
        [savedConfig],
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const reactFlowInstance = useRef<ReactFlowInstance | null>(null);
    const nodesRef = useRef(nodes);
    nodesRef.current = nodes;

    const [sidebarWidth, setSidebarWidth] = useState(192);
    const isDraggingSidebar = useRef(false);
    const dragStartX = useRef(0);
    const dragStartWidth = useRef(0);

    const onSidebarDragStart = useCallback((e: React.MouseEvent) => {
        isDraggingSidebar.current = true;
        dragStartX.current = e.clientX;
        dragStartWidth.current = sidebarWidth;
        e.preventDefault();
    }, [sidebarWidth]);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!isDraggingSidebar.current) return;
            const delta = e.clientX - dragStartX.current;
            setSidebarWidth(Math.max(160, Math.min(480, dragStartWidth.current + delta)));
        };
        const onUp = () => { isDraggingSidebar.current = false; };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, []);

    useEffect(() => {
        if (savedConfig && !hydrated) {
            setName(savedConfig.name || defaultName);
            setNodes(convertToFlowNodes(savedConfig.config, definitions));
            setEdges(convertToFlowEdges(savedConfig.config));
            setHydrated(true);
        }
    }, [savedConfig, definitions, hydrated, defaultName, setNodes, setEdges]);

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
                        type: "smoothstep",
                        animated: true,
                        style: {
                            stroke: "hsl(215 20% 55% / 0.45)",
                            strokeWidth: 1.5,
                        },
                    },
                    eds,
                ),
            );
        },
        [nodes, setEdges],
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
        },
        [setNodes],
    );

    const deleteNode = useCallback(
        (nodeId: string) => {
            setNodes((nds) => nds.filter((n) => n.id !== nodeId));
            setEdges((eds) =>
                eds.filter((e) => e.source !== nodeId && e.target !== nodeId),
            );
            setSelectedNode((prev) => (prev?.id === nodeId ? null : prev));
        },
        [setNodes, setEdges],
    );

    const onDrop = useCallback(
        (event: DragEvent<HTMLDivElement>) => {
            event.preventDefault();
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
        },
        [definitions, setNodes],
    );

    const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }, []);

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
        },
        [definitions, setNodes],
    );

    const selectedNodeDef = useMemo(() => {
        if (!selectedNode) return null;
        return definitions.find((d) => d.type === selectedNode.type) || null;
    }, [selectedNode, definitions]);

    const handleSave = useCallback(async () => {
        const graph = convertFromFlow(nodes, edges);
        try {
            await upsertMutation.mutateAsync({
                slug: configKey,
                data: { name, config: graph },
            });
            toast.success("Config saved");
        } catch {
            toast.error("Failed to save config");
        }
    }, [nodes, edges, name, configKey, upsertMutation]);

    const handlePreview = useCallback(async () => {
        const graph = convertFromFlow(nodes, edges);
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

    if (defsLoading || configLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2
                    size={24}
                    className="animate-spin text-muted-foreground"
                />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <NodeConfigToolbar
                name={name}
                isSaving={upsertMutation.isPending}
                onNameChange={setName}
                onSave={handleSave}
                onPreview={handlePreview}
            />
            <div className="flex flex-1 min-h-0">
                <div style={{ width: sidebarWidth, minWidth: sidebarWidth }} className="relative shrink-0 bg-card">
                    <NodePalette
                        nodeTypes={definitions}
                        onAddNode={addNodeByClick}
                    />
                    <div
                        onMouseDown={onSidebarDragStart}
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-border/60 transition-colors z-10"
                    />
                </div>
                <div
                    className="flex-1 relative"
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                >
                    <ReactFlow
                        colorMode={theme}
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        isValidConnection={isValidConnection}
                        onNodeClick={onNodeClick}
                        onPaneClick={onPaneClick}
                        nodeTypes={nodeTypes}
                        fitView
                        deleteKeyCode={["Backspace", "Delete"]}
                        selectionMode={SelectionMode.Partial}
                        onInit={(instance) => {
                            reactFlowInstance.current = instance;
                        }}
                    >
                        <Background
                            variant={BackgroundVariant.Dots}
                            gap={20}
                            size={1}
                            className="bg-background"
                        />
                        <Controls className="bg-card border border-border/40 rounded-lg" />
                        <MiniMap
                            nodeColor={(node) => {
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
                            maskColor="rgba(0,0,0,0.3)"
                            pannable
                            zoomable
                            className="bg-card! border! border-border! rounded-lg!"
                        />
                    </ReactFlow>
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
    );
}
