import { Terminal, Check, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProvisionDetailData } from "@/types/models";
import type { CopyKey } from "../context/ServerDetailContext";

export function AgentInstallationGuide({
    status,
    provisionDetails,
    generating,
    copiedKey,
    timeLeft,
    generateProvisionToken,
    regenerateProvisionToken,
    copyToClipboard,
}: {
    status: string;
    provisionDetails: ProvisionDetailData | null;
    generating: boolean;
    copiedKey: string | null;
    timeLeft: string;
    generateProvisionToken: () => void;
    regenerateProvisionToken: () => void;
    copyToClipboard: (text: string, type: CopyKey) => void;
}) {
    return (
        <div className="mb-6 p-5 rounded-xl border border-border bg-card/50 backdrop-blur-sm shadow-lg">
            <div className="flex items-center gap-2.5 mb-4 text-foreground font-semibold">
                <Terminal className="size-5 text-primary" />
                <h2>Agent Installation Guide</h2>
            </div>

            {status === "pending_installation" && !provisionDetails && (
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        To start monitoring this server, you must install the
                        lightweight monitoring agent on the machine.
                    </p>
                    <Button
                        variant="default"
                        label={
                            generating
                                ? "Generating..."
                                : "Generate Installation Command"
                        }
                        onClick={generateProvisionToken}
                        disabled={generating}
                    />
                </div>
            )}

            {(status === "waiting_for_installation" ||
                status === "waiting_for_first_heartbeat" ||
                provisionDetails) && (
                    <div className="space-y-5">
                        <p className="text-sm text-muted-foreground">
                            Run the appropriate command directly on your server.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                                    Linux (cURL + bash)
                                </label>
                                <div className="flex items-center gap-2 bg-muted/60 p-2.5 rounded-lg border border-border/80 font-mono text-xs overflow-x-auto select-all">
                                    <span className="flex-1 whitespace-pre-wrap break-all text-foreground">
                                        {provisionDetails?.linux_command ||
                                            `curl -fsSL ${window.location.origin}/install/linux | bash -s -- <token>`}
                                    </span>
                                    {provisionDetails?.linux_command && (
                                        <button
                                            onClick={() =>
                                                copyToClipboard(
                                                    provisionDetails.linux_command!,
                                                    "linux",
                                                )
                                            }
                                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                        >
                                            {copiedKey === "linux" ? (
                                                <Check className="size-4 text-emerald-400" />
                                            ) : (
                                                <Copy className="size-4" />
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                                    Windows (PowerShell)
                                </label>
                                <div className="flex items-center gap-2 bg-muted/60 p-2.5 rounded-lg border border-border/80 font-mono text-xs overflow-x-auto select-all">
                                    <span className="flex-1 whitespace-pre-wrap break-all text-foreground">
                                        {provisionDetails?.windows_command}
                                    </span>
                                    {provisionDetails?.windows_command && (
                                        <button
                                            onClick={() =>
                                                copyToClipboard(
                                                    provisionDetails.windows_command!,
                                                    "windows",
                                                )
                                            }
                                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                        >
                                            {copiedKey === "windows" ? (
                                                <Check className="size-4 text-emerald-400" />
                                            ) : (
                                                <Copy className="size-4" />
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                            <div>
                                {provisionDetails?.expires_at && (
                                    <span>
                                        Token expires at:{" "}
                                        <strong>
                                            {new Date(
                                                provisionDetails.expires_at,
                                            ).toLocaleString()}
                                        </strong>{" "}
                                        <span className="text-amber-500 font-mono ml-1.5">
                                            {timeLeft}
                                        </span>
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={regenerateProvisionToken}
                                className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors font-medium cursor-pointer"
                            >
                                <RefreshCw size={12} />
                                Regenerate Token
                            </button>
                        </div>
                    </div>
                )}
        </div>
    );
}
