import { useMemo, useState } from "react";
import PageLayout from "@/components/PageLayout";
import IndexHeader from "@/components/IndexHeader";
import {
    ScrollText,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useActivityLogs, type ActivityLogData } from "@/hooks/useActivityLogs";

// ─── Column config ────────────────────────────────────────────────────────────

type SortableKey = "logable_type" | "user" | "action" | "created_at";

interface Column {
    key: SortableKey;
    label: string;
}

const COLUMNS: Column[] = [
    { key: "created_at", label: "Timestamp" },
    { key: "logable_type", label: "Subject" },
    { key: "user", label: "User" },
    { key: "action", label: "Action" },
];

const ACTION_STYLES: Record<string, string> = {
    created: "text-emerald-400 bg-emerald-500/10",
    updated: "text-blue-400 bg-blue-500/10",
    deleted: "text-red-400 bg-red-500/10",
};

function actionBadgeClass(action: string): string {
    return (
        ACTION_STYLES[action.toLowerCase()] ??
        "text-muted-foreground bg-muted/40"
    );
}

function shortModel(fqcn: string): string {
    if (!fqcn) return "—";
    const parts = fqcn.split("\\");
    return parts[parts.length - 1];
}

function formatDate(value: string | null): string {
    if (!value) return "—";
    const d = new Date(value);
    return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function RowSkeleton() {
    return (
        <tr className="animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <div className="h-3.5 w-20 bg-muted rounded" />
                </td>
            ))}
        </tr>
    );
}

// ─── Detail modal ─────────────────────────────────────────────────────────────

function LogDetailModal({
    log,
    onClose,
}: {
    log: ActivityLogData | null;
    onClose: () => void;
}) {
    if (!log) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                    <div className="flex items-center gap-2">
                        <ScrollText className="size-4 text-muted-foreground" />
                        <h2 className="text-sm font-semibold text-foreground">
                            Log Entry #{log.id}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-md hover:bg-muted transition-colors cursor-pointer"
                    >
                        <X className="size-4 text-muted-foreground" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                    {/* Top summary */}
                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors",
                                actionBadgeClass(log.action),
                            )}
                        >
                            {log.action}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                            {formatDate(log.created_at)}
                        </span>
                    </div>

                    {/* Details Payload Parsing */}
                    {log.details
                        ? (() => {
                              let parsed: Record<string, any> | null = null;
                              try {
                                  const obj = JSON.parse(log.details);
                                  if (obj && typeof obj === "object") {
                                      parsed = obj;
                                  }
                              } catch {
                                  // not valid json, will fallback below
                              }

                              if (!parsed) {
                                  return (
                                      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/20 p-3 rounded-lg border border-border/50">
                                          {log.details}
                                      </p>
                                  );
                              }

                              // Extract special keys (supporting before/after and old/new aliases)
                              const {
                                  message,
                                  old,
                                  new: newVals,
                                  before,
                                  after,
                                  ...rest
                              } = parsed;

                              const beforeData = before ?? old;
                              const afterData = after ?? newVals;
                              const hasDiff =
                                  beforeData !== undefined ||
                                  afterData !== undefined;
                              const hasRest = Object.keys(rest).length > 0;

                              const isObject = (val: any) =>
                                  val &&
                                  typeof val === "object" &&
                                  !Array.isArray(val);

                              const formatVal = (val: any) => {
                                  if (val === undefined || val === null) {
                                      return (
                                          <span className="text-muted-foreground/45">
                                              —
                                          </span>
                                      );
                                  }
                                  if (typeof val === "object") {
                                      return JSON.stringify(val, null, 2);
                                  }
                                  if (typeof val === "boolean") {
                                      return val ? "true" : "false";
                                  }
                                  return String(val);
                              };

                              // Collect all unique keys for diff comparison
                              const diffKeys = new Set<string>();
                              if (isObject(beforeData))
                                  Object.keys(beforeData).forEach((k) =>
                                      diffKeys.add(k),
                                  );
                              if (isObject(afterData))
                                  Object.keys(afterData).forEach((k) =>
                                      diffKeys.add(k),
                                  );
                              const keyList = Array.from(diffKeys);

                              return (
                                  <div className="flex flex-col gap-4">
                                      {message && (
                                          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3.5">
                                              <p className="text-sm font-medium text-foreground">
                                                  {message}
                                              </p>
                                          </div>
                                      )}

                                      {hasDiff && (
                                          <div className="flex flex-col gap-2">
                                              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                  Changes
                                              </p>

                                              {keyList.length === 0 ? (
                                                  // Fallback for flat comparisons (primitives instead of nested objects)
                                                  <div className="border border-border rounded-lg overflow-hidden bg-card/50">
                                                      <table className="w-full text-xs text-left table-fixed">
                                                          <thead>
                                                              <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                                                                  <th className="px-3 py-2 w-1/2">
                                                                      Before
                                                                  </th>
                                                                  <th className="px-3 py-2 w-1/2">
                                                                      After
                                                                  </th>
                                                              </tr>
                                                          </thead>
                                                          <tbody className="divide-y divide-border font-mono">
                                                              <tr>
                                                                  <td className="px-3 py-2 text-red-500/90 whitespace-pre-wrap break-all">
                                                                      {formatVal(
                                                                          beforeData,
                                                                      )}
                                                                  </td>
                                                                  <td className="px-3 py-2 text-emerald-500/90 whitespace-pre-wrap break-all">
                                                                      {formatVal(
                                                                          afterData,
                                                                      )}
                                                                  </td>
                                                              </tr>
                                                          </tbody>
                                                      </table>
                                                  </div>
                                              ) : (
                                                  // Rich side-by-side key comparison table
                                                  <div className="border border-border rounded-lg overflow-hidden bg-card/50">
                                                      <table className="w-full text-xs text-left">
                                                          <thead>
                                                              <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                                                                  <th className="px-3 py-2 w-1/3">
                                                                      Field
                                                                  </th>
                                                                  <th className="px-3 py-2 w-1/3">
                                                                      Before
                                                                  </th>
                                                                  <th className="px-3 py-2 w-1/3">
                                                                      After
                                                                  </th>
                                                              </tr>
                                                          </thead>
                                                          <tbody className="divide-y divide-border font-mono">
                                                              {keyList.map(
                                                                  (key) => {
                                                                      const bVal =
                                                                          beforeData?.[
                                                                              key
                                                                          ];
                                                                      const aVal =
                                                                          afterData?.[
                                                                              key
                                                                          ];
                                                                      const isChanged =
                                                                          JSON.stringify(
                                                                              bVal,
                                                                          ) !==
                                                                          JSON.stringify(
                                                                              aVal,
                                                                          );

                                                                      return (
                                                                          <tr
                                                                              key={
                                                                                  key
                                                                              }
                                                                              className={cn(
                                                                                  isChanged &&
                                                                                      "bg-muted/10",
                                                                              )}
                                                                          >
                                                                              <td className="px-3 py-2 font-medium text-foreground break-all">
                                                                                  {
                                                                                      key
                                                                                  }
                                                                              </td>
                                                                              <td className="px-3 py-2 text-red-500/90 whitespace-pre-wrap break-all">
                                                                                  {formatVal(
                                                                                      bVal,
                                                                                  )}
                                                                              </td>
                                                                              <td className="px-3 py-2 text-emerald-500/90 whitespace-pre-wrap break-all">
                                                                                  {formatVal(
                                                                                      aVal,
                                                                                  )}
                                                                              </td>
                                                                          </tr>
                                                                      );
                                                                  },
                                                              )}
                                                          </tbody>
                                                      </table>
                                                  </div>
                                              )}
                                          </div>
                                      )}

                                      {hasRest && (
                                          <div className="bg-muted/30 border border-border/60 rounded-lg p-3 overflow-auto">
                                              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                                  Payload Updates
                                              </p>
                                              <pre className="text-xs text-muted-foreground font-mono">
                                                  {JSON.stringify(
                                                      rest,
                                                      null,
                                                      2,
                                                  )}
                                              </pre>
                                          </div>
                                      )}
                                  </div>
                              );
                          })()
                        : null}

                    <div className="h-px bg-border" />

                    {/* Subject / User */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                Subject
                            </p>
                            <p className="text-sm text-foreground truncate">
                                {shortModel(log.logable_type)}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                                #{log.logable_id}
                            </p>
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                User
                            </p>
                            <p className="text-sm text-foreground truncate">
                                {log.user ?? "System"}
                            </p>
                            {log.user_id && (
                                <p className="text-xs text-muted-foreground font-mono">
                                    #{log.user_id}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ActivityLogs() {
    const { data: logs = [], isLoading } = useActivityLogs();

    const [sortField, setSortField] = useState<SortableKey>("created_at");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [selectedLog, setSelectedLog] = useState<ActivityLogData | null>(null);

    const handleSort = (key: SortableKey) => {
        if (sortField === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortField(key);
            setSortDir("asc");
        }
    };

    const sortedLogs = useMemo(() => {
        const copy = [...logs];
        copy.sort((a, b) => {
            const aVal = a[sortField] ?? "";
            const bVal = b[sortField] ?? "";

            if (sortField === "created_at") {
                const aTime = aVal ? new Date(aVal as string).getTime() : 0;
                const bTime = bVal ? new Date(bVal as string).getTime() : 0;
                const diff = aTime - bTime;
                return sortDir === "asc" ? diff : -diff;
            }

            const aStr = String(aVal).toLowerCase();
            const bStr = String(bVal).toLowerCase();
            if (aStr < bStr) return sortDir === "asc" ? -1 : 1;
            if (aStr > bStr) return sortDir === "asc" ? 1 : -1;
            return 0;
        });
        return copy;
    }, [logs, sortField, sortDir]);

    return (
        <PageLayout>
            <IndexHeader icon={ScrollText} title="Activity Logs" />

            <main className="py-6 w-full flex-1 min-h-0">
                <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/60 bg-muted/20">
                                    {COLUMNS.map((col) => {
                                        const isActive = sortField === col.key;
                                        return (
                                            <th
                                                key={col.key}
                                                onClick={() =>
                                                    handleSort(col.key)
                                                }
                                                className="px-4 py-3 text-left cursor-pointer select-none group"
                                            >
                                                <span
                                                    className={cn(
                                                        "flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
                                                        isActive
                                                            ? "text-foreground"
                                                            : "text-muted-foreground group-hover:text-foreground",
                                                    )}
                                                >
                                                    {col.label}
                                                    {isActive ? (
                                                        sortDir === "asc" ? (
                                                            <ArrowUp
                                                                size={12}
                                                            />
                                                        ) : (
                                                            <ArrowDown
                                                                size={12}
                                                            />
                                                        )
                                                    ) : (
                                                        <ArrowUpDown
                                                            size={12}
                                                            className="opacity-0 group-hover:opacity-50 transition-opacity"
                                                        />
                                                    )}
                                                </span>
                                            </th>
                                        );
                                    })}
                                    <th className="px-4 py-3 text-right">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            Details
                                        </span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {isLoading ? (
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <RowSkeleton key={i} />
                                    ))
                                ) : sortedLogs.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={COLUMNS.length + 1}
                                            className="px-4 py-12 text-center text-sm text-muted-foreground"
                                        >
                                            No activity logs recorded yet.
                                        </td>
                                    </tr>
                                ) : (
                                    sortedLogs.map((log) => (
                                        <tr
                                            key={log.id}
                                            className="hover:bg-muted/20 transition-colors"
                                        >
                                            <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                                {formatDate(log.created_at)}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="text-foreground">
                                                    {shortModel(
                                                        log.logable_type,
                                                    )}
                                                </span>
                                                <span className="text-muted-foreground font-mono text-xs ml-1">
                                                    #{log.logable_id}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-foreground">
                                                {log.user ?? "System"}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span>{log.action}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={() =>
                                                        setSelectedLog(log)
                                                    }
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer"
                                                    title="View Details"
                                                >
                                                    <span>View</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            <LogDetailModal
                log={selectedLog}
                onClose={() => setSelectedLog(null)}
            />
        </PageLayout>
    );
}
