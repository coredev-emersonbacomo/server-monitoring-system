import { useState } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import PageLayout from "@/components/PageLayout";
import IndexHeader from "@/components/IndexHeader";
import { FolderSearch, Plus, Pencil, Trash2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import {
    useWatchedPaths,
    useCreateWatchedPath,
    useUpdateWatchedPath,
    useDeleteWatchedPath,
    type WatchedPathData,
    type WatchedPathInput,
} from "@/pages/system-logs/hooks/useAuditLogs";

function WatchedPathDialog({
    initial,
    onClose,
}: {
    initial: WatchedPathData | null;
    onClose: () => void;
}) {
    const create = useCreateWatchedPath();
    const update = useUpdateWatchedPath();
    const [path, setPath] = useState(initial?.path ?? "");
    const [scope, setScope] = useState<"agent" | "server">(
        (initial?.scope as "agent" | "server") ?? "agent",
    );
    const [serverId, setServerId] = useState<string>(
        initial?.server_id ? String(initial.server_id) : "",
    );
    const [enabled, setEnabled] = useState(initial?.enabled ?? true);
    const [description, setDescription] = useState(initial?.description ?? "");
    const [excludePatterns, setExcludePatterns] = useState(
        initial?.exclude_patterns ? initial.exclude_patterns.join("\n") : "",
    );

    const busy = create.isPending || update.isPending;

    const submit = async () => {
        if (!path.trim()) return;
        const patterns = excludePatterns
            .split("\n")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        const payload: WatchedPathInput = {
            path: path.trim(),
            scope,
            server_id: scope === "server" ? Number(serverId) || null : null,
            enabled,
            exclude_patterns: patterns.length ? patterns : null,
            description: description.trim() || null,
        };
        if (initial) {
            await update.mutateAsync({ id: initial.id, input: payload });
        } else {
            await create.mutateAsync(payload);
        }
        onClose();
    };

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {initial ? "Edit Watched Path" : "Add Watched Path"}
                    </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-3">
                    <label className="flex flex-col gap-1 text-sm">
                        <span className="text-muted-foreground">Path</span>
                        <input
                            value={path}
                            onChange={(e) => setPath(e.target.value)}
                            placeholder="C:\ProgramData\MonitorAgent"
                            className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                        <span className="text-muted-foreground">Scope</span>
                        <select
                            value={scope}
                            onChange={(e) =>
                                setScope(e.target.value as "agent" | "server")
                            }
                            className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
                        >
                            <option value="agent">Agent (all servers)</option>
                            <option value="server">Server</option>
                        </select>
                    </label>
                    {scope === "server" && (
                        <label className="flex flex-col gap-1 text-sm">
                            <span className="text-muted-foreground">
                                Server ID
                            </span>
                            <input
                                type="number"
                                value={serverId}
                                onChange={(e) => setServerId(e.target.value)}
                                className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
                            />
                        </label>
                    )}
                    <label className="flex flex-col gap-1 text-sm">
                        <span className="text-muted-foreground">
                            Description
                        </span>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                        />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                        <span className="text-muted-foreground">
                            Exclude patterns (gitignore-style, one per line)
                        </span>
                        <textarea
                            value={excludePatterns}
                            onChange={(e) => setExcludePatterns(e.target.value)}
                            placeholder={"*.log\n*.tmp\nnode_modules"}
                            rows={3}
                            className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                        />
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => setEnabled(e.target.checked)}
                        />
                        Enabled
                    </label>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                    <DialogClose className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border border-border hover:bg-muted transition-colors cursor-pointer">
                        Cancel
                    </DialogClose>
                    <button
                        onClick={submit}
                        disabled={busy || !path.trim()}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                        {busy ? "Saving…" : "Save"}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function FileActivitySettings() {
    useDocumentTitle("File Activity Monitoring");
    const { data: paths = [], isLoading } = useWatchedPaths();
    const del = useDeleteWatchedPath();
    const [editing, setEditing] = useState<WatchedPathData | null>(null);
    const [adding, setAdding] = useState(false);

    return (
        <PageLayout>
            <IndexHeader
                icon={FolderSearch}
                title="File Activity Monitoring"
                description="Configure which paths the agent audits on monitored servers."
                trail={[
                    { label: "Settings", href: "/settings" },
                    { label: "File Activity Monitoring" },
                ]}
            />

            <main className="w-full flex-1 min-h-0 py-6">
                <div className="max-w-7xl mx-auto px-6 flex flex-col gap-4">
                    <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                        <code>%ProgramData%\MonitorAgent</code> is monitored by
                        default (agent-scoped) and always on. Add or edit paths
                        below; changes are pushed to the agent on the next
                        config sync.
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={() => setAdding(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-colors cursor-pointer"
                        >
                            <Plus size={16} /> Add Path
                        </button>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/60 bg-muted/20 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <th className="px-4 py-3 text-left">
                                        Path
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Scope
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Exclude
                                    </th>
                                    <th className="px-4 py-3 text-left">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {isLoading ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-4 py-10 text-center text-muted-foreground"
                                        >
                                            Loading…
                                        </td>
                                    </tr>
                                ) : paths.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-4 py-10 text-center text-muted-foreground"
                                        >
                                            No watched paths configured.
                                        </td>
                                    </tr>
                                ) : (
                                    paths.map((p) => (
                                        <tr
                                            key={p.id}
                                            className="hover:bg-muted/20 transition-colors"
                                        >
                                            <td className="px-4 py-3 text-foreground break-all">
                                                {p.path}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {p.scope}
                                                {p.scope === "server" &&
                                                    p.server_id != null &&
                                                    ` #${p.server_id}`}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {p.exclude_patterns &&
                                                    p.exclude_patterns.length > 0
                                                    ? p.exclude_patterns
                                                        .slice(0, 2)
                                                        .join(", ") +
                                                    (p.exclude_patterns
                                                        .length > 2
                                                        ? "…"
                                                        : "")
                                                    : "—"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={
                                                        p.enabled
                                                            ? "text-emerald-600 dark:text-emerald-400"
                                                            : "text-muted-foreground"
                                                    }
                                                >
                                                    {p.enabled
                                                        ? "Enabled"
                                                        : "Disabled"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        onClick={() =>
                                                            setEditing(p)
                                                        }
                                                        title="Edit"
                                                        className="p-1.5 rounded-md hover:bg-muted transition-colors cursor-pointer"
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            del.mutate(p.id)
                                                        }
                                                        title="Delete"
                                                        className="p-1.5 rounded-md hover:bg-muted text-rose-600 transition-colors cursor-pointer"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {(adding || editing) && (
                <WatchedPathDialog
                    initial={editing}
                    onClose={() => {
                        setAdding(false);
                        setEditing(null);
                    }}
                />
            )}
        </PageLayout>
    );
}
