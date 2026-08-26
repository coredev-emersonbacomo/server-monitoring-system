import { Server } from "lucide-react";
import type { OfflineServer } from "./types";

export function OfflineServersPanel({ servers }: { servers: OfflineServer[] }) {
    return (
        <div className="bg-card border border-border/60 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Server className="w-4 h-4 text-red-400" />
                    Offline Servers
                </h3>
            </div>

            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                {servers.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4 text-xs">
                        No offline servers
                    </p>
                ) : (
                    servers.map((s) => (
                        <div
                            key={s.uuid}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/40"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                                <span className="font-medium text-xs truncate">
                                    {s.name}
                                </span>
                                <span className="text-[11px] text-muted-foreground truncate">
                                    {s.client_name}
                                </span>
                            </div>
                            <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                                {s.went_offline_at
                                    ? (() => {
                                          const d = new Date(s.went_offline_at);
                                          const ago = Math.round(
                                              (Date.now() - d.getTime()) / 60000,
                                          );
                                          return ago < 1
                                              ? "<1m ago"
                                              : ago < 60
                                                ? `${ago}m ago`
                                                : `${Math.floor(ago / 60)}h ${ago % 60}m ago`;
                                      })()
                                    : "unknown"}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
