import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    useConfigs,
    useDeleteConfig,
    useToggleConfig,
} from "@/hooks/node-config/useNodeConfigs";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import PageLayout from "@/components/PageLayout";
import {
    Loader2,
    Plus,
    Trash2,
    ToggleLeft,
    ToggleRight,
    GitBranch,
    ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function NodeConfigsIndex() {
    const { data: configs, isLoading } = useConfigs();
    const deleteMutation = useDeleteConfig();
    const toggleMutation = useToggleConfig();
    const navigate = useNavigate();
    const { setTrail } = useBreadcrumb();

    useEffect(() => {
        setTrail([
            { label: "Settings", href: "/settings" },
            { label: "Alert Configs" },
        ]);
    }, [setTrail]);

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`Delete config "${name}"?`)) return;
        try {
            await deleteMutation.mutateAsync(id);
            toast.success("Config deleted");
        } catch {
            toast.error("Failed to delete config");
        }
    };

    const handleToggle = async (id: number) => {
        try {
            await toggleMutation.mutateAsync(id);
        } catch {
            toast.error("Failed to toggle config");
        }
    };

    return (
        <PageLayout>
            <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
                <div className="flex items-start justify-between gap-4 py-3 px-6 sm:px-8 lg:px-10">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg mt-0.5">
                            <GitBranch className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold tracking-tight">
                                Alert Configs
                            </h1>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Build and manage alert configurations
                            </p>
                        </div>
                    </div>
                    <Button
                        label="New Config"
                        icon={<Plus size={16} />}
                        onClick={() => navigate("/settings/alerts/new")}
                    />
                </div>
            </header>

            <main className="py-6 w-full flex-1">
                <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-10 flex flex-col gap-3">
                    {isLoading && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2
                                size={24}
                                className="animate-spin text-muted-foreground"
                            />
                        </div>
                    )}

                    {configs?.length === 0 && !isLoading && (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                            <GitBranch size={32} className="opacity-30" />
                            <p className="text-sm">
                                No configs yet. Create your first one!
                            </p>
                        </div>
                    )}

                    {configs?.map((c) => (
                        <div
                            key={c.id}
                            className="flex items-center gap-4 p-4 bg-card border border-border/60 rounded-xl shadow-sm hover:shadow-md hover:border-border transition-all group cursor-pointer"
                            onClick={() => navigate(`/settings/alerts/${c.id}`)}
                        >
                            <div className="p-2.5 bg-primary/10 rounded-lg shrink-0">
                                <GitBranch className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm">
                                        {c.name}
                                    </p>
                                    <span
                                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                            c.enabled
                                                ? "bg-emerald-500/10 text-emerald-400"
                                                : "bg-muted text-muted-foreground"
                                        }`}
                                    >
                                        {c.enabled ? "Active" : "Disabled"}
                                    </span>
                                </div>
                                {c.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {c.description}
                                    </p>
                                )}
                                <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                                    {c.config?.nodes?.length || 0} nodes ·{" "}
                                    {c.config?.edges?.length || 0} connections
                                </p>
                            </div>
                            <div
                                className="flex items-center gap-1 shrink-0"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => handleToggle(c.id)}
                                    className="p-2 hover:bg-accent rounded-lg transition-colors"
                                    title={c.enabled ? "Disable" : "Enable"}
                                >
                                    {c.enabled ? (
                                        <ToggleRight
                                            size={16}
                                            className="text-emerald-400"
                                        />
                                    ) : (
                                        <ToggleLeft
                                            size={16}
                                            className="text-muted-foreground"
                                        />
                                    )}
                                </button>
                                <button
                                    onClick={() => handleDelete(c.id, c.name)}
                                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Delete"
                                >
                                    <Trash2
                                        size={16}
                                        className="text-red-400"
                                    />
                                </button>
                                <ChevronRight
                                    size={16}
                                    className="text-muted-foreground group-hover:text-foreground transition-colors ml-1"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </PageLayout>
    );
}
