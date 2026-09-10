import { memo, useEffect, useMemo, useState } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";
import { Filter, Check, Search } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/api/api";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { StatPoint } from "@/types/stats";
import { fmtDatetime, fmtTime } from "@/pages/dashboard/components/chartTime";
import { useServerDetailContext } from "../context/ServerDetailContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PALETTE = [
    "#f59e0b",
    "#f43f5e",
    "#8b5cf6",
    "#10b981",
    "#3b82f6",
    "#eab308",
    "#06b6d4",
    "#ec4899",
];

const normalizeNetworks = (v: unknown): Array<{ name: string; netIn: number; netOut: number }> => {
    if (!v) return [];
    if (Array.isArray(v)) return v as Array<{ name: string; netIn: number; netOut: number }>;
    if (typeof v === "object") return Object.values(v as Record<string, unknown>) as Array<{ name: string; netIn: number; netOut: number }>;
    return [];
};

function InterfaceFilter({ uuid }: { uuid: string }) {
    const { server } = useServerDetailContext();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [sel, setSel] = useState<Set<string> | null>(null);

    const options = useMemo(() => {
        const seen = new Map<string, { type: string; state: string }>();
        const availRaw = server?.available_interfaces as unknown;
        const availList: Array<{ interface?: string; name?: string; type?: string; state?: string }> = Array.isArray(availRaw)
            ? (availRaw as Array<{ interface?: string; name?: string; type?: string; state?: string }>)
            : availRaw && typeof availRaw === "object"
              ? (Object.values(availRaw as Record<string, unknown>) as Array<{ interface?: string; name?: string; type?: string; state?: string }>)
              : [];
        for (const iface of availList) {
            const name = iface.interface ?? iface.name;
            if (!name) continue;
            seen.set(name, { type: iface.type ?? "unknown", state: iface.state ?? "unknown" });
        }
        if (seen.size === 0) {
            const statsRaw = server?.stats as unknown;
            const statsList: Array<{ networks?: { name: string }[] }> = Array.isArray(statsRaw)
                ? (statsRaw as Array<{ networks?: { name: string }[] }>)
                : statsRaw && typeof statsRaw === "object"
                  ? (Object.values(statsRaw as Record<string, unknown>) as Array<{ networks?: { name: string }[] }>)
                  : [];
            for (const pt of statsList) {
                for (const n of pt.networks ?? []) {
                    if (!seen.has(n.name)) seen.set(n.name, { type: "unknown", state: "up" });
                }
            }
        }
        return [...seen.entries()]
            .map(([name, meta]) => ({
                key: name,
                label: name,
                descriptor: `${meta.type} · ${meta.state}`,
            }))
            .sort((a, b) => a.key.localeCompare(b.key));
    }, [server?.available_interfaces, server?.stats]);

    const stored = (server as unknown as { network_filter?: string[] | null })?.network_filter ?? null;
    const allChecked = sel === null;

    useEffect(() => {
        if (!open) return;
        setSel(stored ? new Set(stored) : null);
    }, [open, stored]);

    const visibleOptions = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return options;
        return options.filter(
            (o) => o.label.toLowerCase().includes(q) || o.descriptor.toLowerCase().includes(q),
        );
    }, [options, search]);

    const toggle = (key: string) =>
        setSel((prev) => {
            const base = prev ?? new Set(options.map((o) => o.key));
            const next = new Set(base);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next.size === options.length ? null : next;
        });
    const toggleAll = () => setSel((prev) => (prev === null ? new Set() : null));

    const same = (s: Set<string> | null, arr: string[] | null | undefined) => {
        if (s === null) return arr == null;
        if (arr == null) return false;
        return s.size === arr.length && arr.every((v) => s.has(v));
    };
    const dirty = !same(sel, stored as string[] | null);

    const save = async () => {
        if (!server?.client_uuid) return;
        setSaving(true);
        try {
            const body = {
                network_filter: sel === null ? null : [...sel].sort(),
            };
            const { error } = await (api as unknown as { PATCH: typeof api.PATCH }).PATCH(
                "/v1/clients/{clientUuid}/servers/{serverUuid}/monitoring" as never,
                {
                    params: { path: { clientUuid: server.client_uuid, serverUuid: uuid } },
                    body: body as never,
                } as never,
            );
            if (error) toast.error("Failed to save network filter.");
            else {
                toast.success("Network filter saved.");
                setOpen(false);
                queryClient.invalidateQueries({ queryKey: ["server", uuid] });
            }
        } catch {
            toast.error("An error occurred.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Button
                variant="outline"
                size="icon"
                icon={<Filter size={14} />}
                aria-label="Edit interfaces filter"
                onClick={() => setOpen(true)}
            />
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Filter size={16} className="text-primary" /> Interfaces Monitoring Filter
                        </DialogTitle>
                        <DialogDescription>
                            Only the interfaces you leave checked are reported for this server. Everything checked means the agent reports all non-disconnected interfaces.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-[60vh] overflow-y-auto pr-1">
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                                    <input type="checkbox" checked={allChecked} onChange={toggleAll} className="accent-primary cursor-pointer" />
                                    Interfaces ({allChecked ? "all" : `${sel?.size ?? 0} of ${options.length}`})
                                </label>
                                {options.length > 0 && (
                                    <div className="relative ml-auto">
                                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Search interfaces..."
                                            className="bg-background border border-border rounded-md pl-7 pr-2 h-9 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 w-44"
                                        />
                                    </div>
                                )}
                            </div>
                            {options.length > 0 ? (
                                <div className="grid grid-cols-1 gap-1.5">
                                    {visibleOptions.map((o) => {
                                        const on = sel?.has(o.key) ?? allChecked;
                                        return (
                                            <button
                                                key={o.key}
                                                onClick={() => toggle(o.key)}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2 rounded-md border text-left text-xs transition-colors cursor-pointer",
                                                    on
                                                        ? "bg-primary/15 border-primary/30 text-foreground"
                                                        : "bg-muted/30 border-border/40 text-muted-foreground hover:text-foreground",
                                                )}
                                            >
                                                <span className={cn("size-4 rounded border flex items-center justify-center shrink-0", on ? "bg-primary border-primary text-primary-foreground" : "bg-background border-border")}>
                                                    {on && <Check size={11} />}
                                                </span>
                                                <span className="font-semibold text-sm truncate">{o.label}</span>
                                                <span className="truncate">{o.descriptor}</span>
                                            </button>
                                        );
                                    })}
                                    {visibleOptions.length === 0 && (
                                        <p className="text-xs text-muted-foreground col-span-1">No interfaces match your search.</p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">No interfaces reported yet.</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <div className="flex w-full items-center justify-between gap-2 pt-4">
                            <Button variant="ghost" size="sm" label="Reset to all" onClick={() => setSel(null)} />
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" label="Cancel" onClick={() => setOpen(false)} />
                                <Button size="sm" label={saving ? "Saving..." : "Save"} disabled={!dirty || saving} onClick={save} />
                            </div>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

interface NetworkTrafficChartProps {
    data?: StatPoint[];
    timeSpan?: string;
    uuid: string;
}

export const NetworkTrafficChart = memo(function NetworkTrafficChart({
    data = [],
    timeSpan = "1H",
    uuid,
}: NetworkTrafficChartProps) {
    const { server } = useServerDetailContext();

    const displayName = (name: string) => {
        if (name === "Bluetooth Network Connection") return "Bluetooth";
        return name.length > 14 ? `${name.slice(0, 12)}…` : name;
    };

    const allInterfaces = useMemo(() => {
        // Prefer available_interfaces (non-disconnected, e.g. Wi-Fi only) — data may still contain
        // disconnected Bluetooth with 0 values from older heartbeats, which would make the legend too long.
        const availRaw = server?.available_interfaces as unknown;
        const availList: Array<Record<string, string>> = Array.isArray(availRaw)
            ? (availRaw as Array<Record<string, string>>)
            : availRaw && typeof availRaw === "object"
              ? (Object.values(availRaw as Record<string, unknown>) as Array<Record<string, string>>)
              : [];
        if (availList.length > 0) {
            const names: string[] = [];
            const seen = new Set<string>();
            for (const iface of availList) {
                const name = (iface as Record<string, string>).interface ?? (iface as Record<string, string>).name;
                if (name && !seen.has(name)) {
                    seen.add(name);
                    names.push(name);
                }
            }
            if (names.length > 0) return names;
        }
        // Fallback to data-derived list when available not yet reported
        const names: string[] = [];
        const seen = new Set<string>();
        const dataList: StatPoint[] = Array.isArray(data)
            ? data
            : data && typeof data === "object"
              ? (Object.values(data as unknown as Record<string, unknown>) as StatPoint[])
              : [];
        for (const point of dataList) {
            for (const net of normalizeNetworks(point.networks)) {
                if (!seen.has(net.name)) {
                    seen.add(net.name);
                    names.push(net.name);
                }
            }
        }
        return names;
    }, [data, server?.available_interfaces]);

    const filter = (server as unknown as { network_filter?: string[] | null })?.network_filter ?? null;
    const filteredNames = useMemo(() => {
        if (filter === null) return allInterfaces;
        const set = new Set(filter);
        return allInterfaces.filter((n) => set.has(n));
    }, [allInterfaces, filter]);

    const colorOf = useMemo(() => new Map(allInterfaces.map((name, i) => [name, PALETTE[i % PALETTE.length]])), [allInterfaces]);

    const rowsIn = useMemo(
        () =>
            (Array.isArray(data) ? data : data ? (Object.values(data as unknown as Record<string, unknown>) as typeof data) : []).map((point) => {
                const row: Record<string, number> = { timestamp: point.timestamp };
                for (const net of normalizeNetworks(point.networks)) {
                    if (filteredNames.includes(net.name)) row[net.name] = net.netIn;
                }
                return row;
            }),
        [data, filteredNames],
    );

    const rowsOut = useMemo(
        () =>
            (Array.isArray(data) ? data : data ? (Object.values(data as unknown as Record<string, unknown>) as typeof data) : []).map((point) => {
                const row: Record<string, number> = { timestamp: point.timestamp };
                for (const net of normalizeNetworks(point.networks)) {
                    if (filteredNames.includes(net.name)) row[net.name] = net.netOut;
                }
                return row;
            }),
        [data, filteredNames],
    );

    const tsValues = data.map((d) => d.timestamp);
    const xDomain: [number, number] =
        tsValues.length < 2 ? [(tsValues[0] ?? 0) - 60000, (tsValues[0] ?? 0) + 60000] : [Math.min(...tsValues), Math.max(...tsValues)];

    const renderChart = (rows: Record<string, number>[], title: string, _unit: string, showFilter: boolean) => (
        <div className="rounded-lg border border-border/60 bg-card/40 p-3 py-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{title}</span>
                {showFilter && <InterfaceFilter uuid={uuid} />}
            </div>
            <div>
                {filteredNames.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={rows} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                            <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.5} vertical={false} />
                            <XAxis
                                dataKey="timestamp"
                                type="number"
                                scale="time"
                                domain={xDomain}
                                tickFormatter={(ts) => fmtTime(Number(ts), timeSpan)}
                                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={30}
                            />
                            <YAxis
                                domain={["auto", "auto"]}
                                tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
                                tickLine={false}
                                axisLine={false}
                                width={52}
                                tickFormatter={(v: number) => `${v} MB/s`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "oklch(0.205 0 0)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: "8px",
                                    fontSize: "11px",
                                    padding: "6px 10px",
                                    color: "rgba(255,255,255,0.85)",
                                }}
                                labelFormatter={(v) => fmtDatetime(Number(v), timeSpan)}
                                formatter={(v: unknown, name: unknown) =>
                                    v == null
                                        ? ["—", String(name)]
                                        : [`${Number(v).toFixed(2)} MB/s`, String(name)]
                                }
                                cursor={{ stroke: "rgba(255,255,255,0.07)", strokeWidth: 32 }}
                            />
                            {filteredNames.map((name) => (
                                <Line
                                    key={name}
                                    type="monotone"
                                    dataKey={name}
                                    name={name}
                                    stroke={colorOf.get(name) ?? PALETTE[0]}
                                    dot={false}
                                    strokeWidth={1.5}
                                    isAnimationActive={false}
                                />
                            ))}
                            <Legend
                                verticalAlign="bottom"
                                align="left"
                                height={22}
                                iconType="square"
                                iconSize={10}
                                wrapperStyle={{
                                    fontSize: "11px",
                                    paddingTop: "8px",
                                    textAlign: "left",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    lineHeight: "10px",
                                }}
                                formatter={(value: string) => (
                                    <span
                                        style={{
                                            color: "var(--color-foreground)",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            verticalAlign: "middle",
                                            lineHeight: "10px",
                                        }}
                                    >
                                        {displayName(String(value))}
                                    </span>
                                )}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center w-full" style={{ height: 110 }}>
                        <div className="flex flex-col items-center gap-2">
                            <svg width="56" height="36" viewBox="0 0 56 36" fill="none" className="text-border">
                                <path d="M4 32 L14 22 L24 28 L34 12 L44 18 L52 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
                                <circle cx="52" cy="6" r="2.5" fill="currentColor" opacity="0.55" />
                            </svg>
                            <span className="text-xs text-muted-foreground/50">
                                {allInterfaces.length === 0 ? "No network data reported yet" : "No interfaces checked — use the filter to select interfaces"}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            {renderChart(rowsIn, "Net In", " MB/s", true)}
            {renderChart(rowsOut, "Net Out", " MB/s", false)}
        </>
    );
});
