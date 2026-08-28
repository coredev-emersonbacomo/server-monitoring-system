import { AlertTriangle, Copy, Trash2 } from "lucide-react";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useServerDetailContext } from "../context/ServerDetailContext";

export function DeleteModalDangerZone() {
    const {
        initial,
        confirmText,
        setConfirmText,
        deleteServer,
        isConfirmed,
        allClient,
        navigate,
        copyToClipboard,
    } = useServerDetailContext();

    const isArchived =
        initial?.record_status === "archived" || initial?.status === "archived";
    if (isArchived) return null;

    return (
        <div className="mt-6 p-4 rounded-xl border border-destructive/20 bg-destructive/5">
            <p className="text-xs font-semibold text-destructive uppercase tracking-wider mb-3">
                Danger Zone
            </p>
            <Form.DeleteModal
                buttonProps={{
                    variant: "danger",
                    size: "sm",
                    icon: <Trash2 size={13} />,
                }}
                onOpenChange={(open: boolean) => {
                    if (!open) setConfirmText("");
                }}
                modal={(show: (open: boolean) => void) => (
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-destructive">
                                <Trash2 size={16} />
                                Delete server
                            </DialogTitle>
                        </DialogHeader>

                        <p className="text-sm text-muted-foreground">
                            This will permanently stop monitoring{" "}
                            <strong className="text-foreground">
                                {initial?.name}
                            </strong>{" "}
                            and remove all collected metrics. This cannot be
                            undone.
                        </p>

                        {initial && initial.agent && !initial.agent_deleted && initial.status !== "agent_uninstalled" && initial.agent?.status !== "revoked" && (
                            <>
                                {(
                                    initial as unknown as {
                                        agent_server_count?: number;
                                    }
                                ).agent_server_count !== undefined &&
                                (
                                    initial as unknown as {
                                        agent_server_count?: number;
                                    }
                                ).agent_server_count! > 1 ? (
                                    <div className="flex flex-col gap-3 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs my-3">
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-500" />
                                            <div>
                                                <p className="font-semibold text-foreground">
                                                    Shared Agent — Detach
                                                    Instead
                                                </p>
                                                <p className="text-muted-foreground mt-0.5">
                                                    This host agent monitors{" "}
                                                    <strong className="text-foreground">
                                                        {
                                                            (
                                                                initial as unknown as {
                                                                    agent_server_count?: number;
                                                                }
                                                            ).agent_server_count
                                                        }{" "}
                                                        servers
                                                    </strong>
                                                    . Deleting{" "}
                                                    <strong className="text-foreground">
                                                        {initial.name}
                                                    </strong>{" "}
                                                    will only detach it from the
                                                    shared agent — the agent
                                                    will stay installed for the
                                                    other server(s).
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2.5 mt-1 text-foreground">
                                            <p className="text-[11px] text-muted-foreground">
                                                To detach via the host (same
                                                command flow as uninstall), run:
                                            </p>
                                            <div>
                                                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                                    Linux (bash) — detach
                                                </label>
                                                <div className="flex items-center gap-2 bg-background p-2 rounded border border-border font-mono text-[11px] overflow-x-auto select-all">
                                                    <span className="flex-1 whitespace-pre-wrap break-all">
                                                        {
                                                            (
                                                                initial as unknown as {
                                                                    detach_linux_command?: string;
                                                                }
                                                            )
                                                                .detach_linux_command
                                                        }
                                                    </span>
                                                    <button
                                                        onClick={() =>
                                                            copyToClipboard(
                                                                (
                                                                    initial as unknown as {
                                                                        detach_linux_command?: string;
                                                                    }
                                                                )
                                                                    .detach_linux_command!,
                                                                "uninstall_linux",
                                                            )
                                                        }
                                                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                                    >
                                                        <Copy className="size-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                                    Windows (PowerShell) —
                                                    detach
                                                </label>
                                                <div className="flex items-center gap-2 bg-background p-2 rounded border border-border font-mono text-[11px] overflow-x-auto select-all">
                                                    <span className="flex-1 whitespace-pre-wrap break-all">
                                                        {
                                                            (
                                                                initial as unknown as {
                                                                    detach_windows_command?: string;
                                                                }
                                                            )
                                                                .detach_windows_command
                                                        }
                                                    </span>
                                                    <button
                                                        onClick={() =>
                                                            copyToClipboard(
                                                                (
                                                                    initial as unknown as {
                                                                        detach_windows_command?: string;
                                                                    }
                                                                )
                                                                    .detach_windows_command!,
                                                                "uninstall_windows",
                                                            )
                                                        }
                                                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                                    >
                                                        <Copy className="size-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3 p-3.5 bg-destructive/5 border border-destructive/20 rounded-lg text-xs text-destructive">
                                        <div className="flex items-start gap-2">
                                            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-semibold text-foreground">
                                                    Agent Uninstallation
                                                    Required
                                                </p>
                                                <p className="text-muted-foreground mt-0.5">
                                                    You must uninstall the agent
                                                    service from the target
                                                    machine before you can
                                                    delete this server. Run the
                                                    command for your operating
                                                    system:
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2.5 mt-1 text-foreground">
                                            <div>
                                                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                                    Linux (bash)
                                                </label>
                                                <div className="flex items-center gap-2 bg-background p-2 rounded border border-border font-mono text-[11px] overflow-x-auto select-all">
                                                    <span className="flex-1 whitespace-pre-wrap break-all">
                                                        {
                                                            initial.uninstall_linux_command
                                                        }
                                                    </span>
                                                    <button
                                                        onClick={() =>
                                                            copyToClipboard(
                                                                initial.uninstall_linux_command!,
                                                                "uninstall_linux",
                                                            )
                                                        }
                                                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                                    >
                                                        <Copy className="size-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                                    Windows (PowerShell)
                                                </label>
                                                <div className="flex items-center gap-2 bg-background p-2 rounded border border-border font-mono text-[11px] overflow-x-auto select-all">
                                                    <span className="flex-1 whitespace-pre-wrap break-all">
                                                        {
                                                            initial.uninstall_windows_command
                                                        }
                                                    </span>
                                                    <button
                                                        onClick={() =>
                                                            copyToClipboard(
                                                                initial.uninstall_windows_command!,
                                                                "uninstall_windows",
                                                            )
                                                        }
                                                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                                    >
                                                        <Copy className="size-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        <div className="flex flex-col gap-2 pt-1">
                            <label className="text-xs text-muted-foreground">
                                Type{" "}
                                <strong className="text-foreground font-mono">
                                    {initial?.name}
                                </strong>{" "}
                                to confirm
                            </label>
                            <Input
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder={initial?.name}
                                autoFocus
                                className="font-mono text-sm"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Form.Buttons.Cancel
                                onClick={() => {
                                    show(false);
                                    setConfirmText("");
                                }}
                            />
                            <Form.Button
                                variant="danger"
                                disabled={
                                    !isConfirmed || deleteServer.isPending
                                }
                                onClick={async () => {
                                    if (
                                        !initial ||
                                        !isConfirmed ||
                                        !initial.client_uuid
                                    )
                                        return;
                                    try {
                                        await deleteServer.mutateAsync({
                                            clientUuid: initial.client_uuid,
                                            serverUuid: initial.uuid,
                                        });
                                        toast.success(
                                            `${initial.name} has been deleted.`,
                                        );
                                        if (allClient) {
                                            navigate("/servers");
                                        } else {
                                            navigate(
                                                `/clients/${initial.client_uuid}`,
                                            );
                                        }
                                    } catch (err: unknown) {
                                        const msg =
                                            (
                                                err as {
                                                    message?: string;
                                                }
                                            )?.message ||
                                            "Failed to delete server. Please try again.";
                                        toast.error(msg);
                                    }
                                }}
                            >
                                {deleteServer.isPending
                                    ? "Deleting…"
                                    : "Delete server"}
                            </Form.Button>
                        </div>
                    </DialogContent>
                )}
            >
                Delete this server
            </Form.DeleteModal>
        </div>
    );
}
