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
import type {
    NodeConfig,
    NodeConfigGraph,
    NodeTypeDefinition,
} from "@/types/node-config";
import {
    useNodeTypes,
    useUpdateConfig,
    useCreateConfig,
    useTestConfig,
    useResetConfigState,
} from "@/hooks/node-config/useNodeConfigs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useOutletFullScreen } from "@/hooks/useOutletLayout";
import { useTheme } from "@/hooks/useTheme";

let nodeIdCounter = 0;
const generateId = () => `node_${++nodeIdCounter}_${Date.now()}`;
const edgeIdCounter = () =>
    `edge_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

function convertToFlowNodes(
    config: NodeConfigGraph,
    definitions: NodeTypeDefinition[],
): Node[] {
    return (config.nodes || []).map((n) => ({
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
    return (config.edges || []).map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        type: "smoothstep",
        animated: true,
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
    config?: NodeConfig;
    onSaveComplete?: () => void;
}

export function NodeConfigEditor({
    config,
    onSaveComplete,
}: NodeConfigEditorProps) {
    const { data: definitions = [], isLoading: defsLoading } = useNodeTypes();
    const updateMutation = useUpdateConfig();
    const createMutation = useCreateConfig();
    const testMutation = useTestConfig();
    const resetMutation = useResetConfigState();
    useOutletFullScreen(true);
    const { theme } = useTheme();

    const [name, setName] = useState(config?.name || "Untitled Config");
    const [enabled, setEnabled] = useState(config?.enabled ?? true);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);

    const initialNodes = useMemo(
        () => (config ? convertToFlowNodes(config.config, definitions) : []),
        [config, definitions],
    );
    const initialEdges = useMemo(
        () => (config ? convertToFlowEdges(config.config) : []),
        [config],
    );

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

    useEffect(() => {
        if (config) {
            setName(config.name);
            setEnabled(config.enabled);
            setNodes(convertToFlowNodes(config.config, definitions));
            setEdges(convertToFlowEdges(config.config));
        }
    }, [config, definitions, setNodes, setEdges]);

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
            if (!source || !target || !sourceHandle || !targetHandle) return false;
            const sourceDef = getOutputType(nodes.find(n => n.id === source)?.type || '');
            const targetDef = getInputType(nodes.find(n => n.id === target)?.type || '', targetHandle);
            if (!sourceDef || !targetDef) return false;
            if (targetDef.type === 'any') return true;
            return sourceDef.type === targetDef.type;
        },
        [nodes],
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
            if (config?.id) {
                await updateMutation.mutateAsync({
                    id: config.id,
                    data: { name, config: graph, enabled },
                });
            } else {
                await createMutation.mutateAsync({
                    name,
                    config: graph,
                    enabled,
                });
            }
            toast.success("Config saved");
            onSaveComplete?.();
        } catch {
            toast.error("Failed to save config");
        }
    }, [
        nodes,
        edges,
        name,
        enabled,
        config,
        updateMutation,
        createMutation,
        onSaveComplete,
    ]);

    const handleToggle = useCallback(async () => {
        if (!config?.id) return;
        try {
            const result = await updateMutation.mutateAsync({
                id: config.id,
                data: {
                    name,
                    config: convertFromFlow(nodes, edges),
                    enabled: !enabled,
                },
            });
            setEnabled(result.enabled);
            toast.success(
                result.enabled ? "Config enabled" : "Config disabled",
            );
        } catch {
            toast.error("Failed to toggle config");
        }
    }, [config, updateMutation, name, nodes, edges, enabled]);

    const handleTest = useCallback(async () => {
        if (!config?.id) return;
        const sourceNodes = nodes.filter((n) => {
            const def = definitions.find((d) => d.type === n.type);
            return def?.category === "metric";
        });
        if (sourceNodes.length === 0) {
            toast.error("No source nodes to test from");
            return;
        }
        const sourceNode = sourceNodes[0];
        try {
            const result = await testMutation.mutateAsync({
                id: config.id,
                sourceNodeId: sourceNode.id,
                value: 90,
                extraState: {},
            });
            const data = result as {
                success: boolean;
                outputs?: Record<string, unknown>;
                actions?: Array<unknown>;
            };
            const actionCount = data.actions?.length || 0;
            if (data.success) {
                toast.success(
                    `Test passed. ${actionCount} action(s) would fire.`,
                );
            } else {
                toast.error("Test completed with issues");
            }
        } catch {
            toast.error("Test execution failed");
        }
    }, [config, nodes, definitions, testMutation]);

    const handleReset = useCallback(async () => {
        if (!config?.id) return;
        try {
            await resetMutation.mutateAsync(config.id);
            toast.success("Node state reset");
        } catch {
            toast.error("Failed to reset state");
        }
    }, [config, resetMutation]);

    if (defsLoading) {
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
                enabled={enabled}
                isSaving={updateMutation.isPending || createMutation.isPending}
                onNameChange={setName}
                onSave={handleSave}
                onToggle={handleToggle}
                onTest={handleTest}
                onReset={handleReset}
            />
            <div className="flex flex-1 min-h-0">
                <NodePalette
                    nodeTypes={definitions}
                    onAddNode={addNodeByClick}
                />
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
                            className="bg-card border border-border/40 rounded-lg"
                        />
                    </ReactFlow>
                </div>
                <NodeSettingsPanel
                    node={selectedNode}
                    nodeTypeDef={selectedNodeDef}
                    onUpdate={updateNodeSettings}
                    onDelete={deleteNode}
                    onClose={() => setSelectedNode(null)}
                />
            </div>
        </div>
    );
}
