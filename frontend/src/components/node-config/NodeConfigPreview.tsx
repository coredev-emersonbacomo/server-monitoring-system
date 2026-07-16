import { useMemo, useCallback, useState } from "react";
import {
    ReactFlow,
    type Node,
    type Edge,
    Background,
    BackgroundVariant,
    Controls,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Maximize2, Loader2 } from "lucide-react";
import { nodeTypes } from "./nodes";
import type { NodeConfigGraph } from "@/types/node-config";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { NodeConfigEditor } from "./NodeConfigEditor";

interface NodeConfigPreviewProps {
    config: NodeConfigGraph | null;
    name: string;
    slug?: string;
    scopeType: string;
    scopeLabel: string;
    isEditable?: boolean;
    configKey?: string;
}

function convertToFlowNodes(
    config: NodeConfigGraph | null,
): Node[] {
    return (config?.nodes || []).map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: {
            label: n.settings?.label || n.type,
            ...n.settings,
        } as Record<string, unknown>,
    }));
}

function convertToFlowEdges(config: NodeConfigGraph | null): Edge[] {
    return (config?.edges || []).map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        type: "smoothstep",
        animated: true,
        style: {
            stroke: "hsl(215 20% 55% / 0.45)",
            strokeWidth: 1.5,
        },
    }));
}

export function NodeConfigPreview({
    config,
    name,
    slug,
    scopeType,
    scopeLabel,
    isEditable = false,
    configKey,
}: NodeConfigPreviewProps) {
    const [maximized, setMaximized] = useState(false);

    const nodes = useMemo(() => convertToFlowNodes(config), [config]);
    const edges = useMemo(() => convertToFlowEdges(config), [config]);

    const isEmpty = !config || (config.nodes.length === 0 && config.edges.length === 0);

    const displayName = useMemo(() => {
        if (scopeType === "global") return "Global Alert Config";
        if (scopeType === "client") return `Client Alert Config`;
        if (scopeType === "server") return `Server Alert Config`;
        return name;
    }, [scopeType, name]);

    return (
        <>
            <div className="relative rounded-xl border border-border/40 bg-background overflow-hidden">
                <div className="h-[280px]">
                    {isEmpty ? (
                        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                            No alerts configured
                        </div>
                    ) : (
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            nodeTypes={nodeTypes}
                            fitView
                            proOptions={{ hideAttribution: true }}
                            nodesDraggable={true}
                            nodesConnectable={false}
                            elementsSelectable={false}
                            panOnDrag={true}
                            zoomOnScroll={true}
                            zoomOnPinch={true}
                        >
                            <Background
                                variant={BackgroundVariant.Dots}
                                gap={20}
                                size={1}
                                className="bg-background"
                            />
                            <Controls
                                className="bg-card border border-border/40 rounded-lg !bottom-2 !right-2"
                                showInteractive={false}
                            />
                        </ReactFlow>
                    )}
                </div>
                {isEditable && !isEmpty && (
                    <button
                        onClick={() => setMaximized(true)}
                        className="absolute top-2 right-2 p-1.5 rounded-md bg-card/80 backdrop-blur border border-border/40 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        title="Open full editor"
                    >
                        <Maximize2 size={14} />
                    </button>
                )}
            </div>

            {isEditable && configKey && (
                <Dialog open={maximized} onOpenChange={setMaximized}>
                    <DialogContent className="max-w-[95vw] h-[90vh] p-0">
                        <DialogHeader className="px-4 pt-4 pb-2">
                            <DialogTitle>{displayName}</DialogTitle>
                        </DialogHeader>
                        <div className="flex-1 min-h-0">
                            <NodeConfigEditor
                                configKey={configKey}
                                defaultName={name}
                                scopeType={scopeType}
                                scopeLabel={scopeLabel}
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
