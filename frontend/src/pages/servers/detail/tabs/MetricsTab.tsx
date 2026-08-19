import { useEffect, useMemo, useState } from "react";
import { Cpu, Link2, RefreshCw, Filter, Check } from "lucide-react";
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
import { ServerStatChart } from "@/pages/dashboard/components/ServerStatChart";
import { cn } from "@/lib/utils";
import { useServerDetailContext } from "../context/ServerDetailContext";
import { CHARTS } from "../constants/charts";
import { toast } from "sonner";
import type { TimeSpan, TimeSpanArgs } from "../types";

// SecOps spotlight: which ports and processes matter for THIS server. null
// (all checked) means "report everything the agent's noise filter allows";
// an array is the exact set to report. Applied by the agent (what it sends)
// and by the backend ping job (what it probes).
function MonitoringFilter({ uuid }: { uuid: string }) {
    const { server } = useServerDetailContext();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const portOptions = useMemo(() => {
        const byPort = new Map<number, { protocols: Set<string>; procs: Set<string> }>();
        for (const p of server?.ports ?? []) {
            const e = byPort.get(p.port) ?? { protocols: new Set<string>(), procs: new Set<string>() };
            if (p.protocol) e.protocols.add(p.protocol);
            if (p.process) e.procs.add(p.process);
            byPort.set(p.port, e);
        }
        return [...byPort.entries()]
            .map(([port, { protocols, procs }]) => ({
                port,
                descriptor: [
                    [...protocols].map((x) => x.toUpperCase()).join("/"),
                    procs.size ? [...procs].join(", ") : "unknown",
                ].filter(Boolean).join(" · "),
            }))
            .sort((a, b) => a.port - b.port);
    }, [server?.ports]);

    const procOptions = useMemo(() => {
        const byName = new Map<string, number>();
        for (const p of server?.processes ?? []) {
            if (!p.name) continue;
            const prev = byName.get(p.name);
            byName.set(p.name, prev === undefined ? p.pid : Math.min(prev, p.pid));
        }
        return [...byName.entries()]
            .map(([name, pid]) => ({ name, descriptor: `pid ${pid}` }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [server?.processes]);

    const [portSel, setPortSel] = useState<Set<number> | null>(null);
    const [procSel, setProcSel] = useState<Set<string> | null>(null);

    // Re-sync from the persisted filter every time the modal opens, so a
    // discarded edit never lingers.
    useEffect(() => {
        if (!open) return;
        setPortSel(server?.port_filter ? new Set(server.port_filter) : null);
        setProcSel(server?.process_filter ? new Set(server.process_filter) : null);
    }, [open, server?.port_filter, server?.process_filter]);

    const togglePort = (port: number) =>
        setPortSel((prev) => {
            const base = prev ?? new Set(portOptions.map((o) => o.port));
            const next = new Set(base);
            if (next.has(port)) next.delete(port);
            else next.add(port);
            return next.size === portOptions.length ? null : next;
        });
    const toggleProc = (name: string) =>
        setProcSel((prev) => {
            const base = prev ?? new Set(procOptions.map((o) => o.name));
            const next = new Set(base);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next.size === procOptions.length ? null : next;
        });
    const toggleAllPorts = () => setPortSel((prev) => (prev === null ? new Set() : null));
    const toggleAllProcs = () => setProcSel((prev) => (prev === null ? new Set() : null));

    const sameNumbers = (sel: Set<number> | null, stored: number[] | null | undefined) => {
        if (sel === null) return stored == null;
        if (stored == null) return false;
        return sel.size === stored.length && stored.every((v) => sel.has(v));
    };
    const sameStrings = (sel: Set<string> | null, stored: string[] | null | undefined) => {
        if (sel === null) return stored == null;
        if (stored == null) return false;
        return sel.size === stored.length && stored.every((v) => sel.has(v));
    };
    const dirty =
        !sameNumbers(portSel, server?.port_filter) ||
        !sameStrings(procSel, server?.process_filter);

    const save = async () => {
        if (!server?.client_uuid) return;
        setSaving(true);
        try {
            const { error } = await api.PATCH(
                "/v1/clients/{clientUuid}/servers/{serverUuid}/monitoring",
                {
                    params: { path: { clientUuid: server.client_uuid, serverUuid: uuid } },
                    body: {
                        port_filter: portSel === null ? null : [...portSel].sort((a, b) => a - b),
                        process_filter: procSel === null ? null : [...procSel].sort(),
                    },
                },
            );
            if (error) {
                toast.error("Failed to save monitoring filter.");
            } else {
                toast.success("Monitoring filter saved.");
                setOpen(false);
                queryClient.invalidateQueries({ queryKey: ["server", uuid] });
            }
        } catch {
            toast.error("An error occurred.");
        } finally {
            setSaving(false);
        }
    };

    const allPorts = portSel === null;
    const allProcs = procSel === null;

    return (
        <>
            <div className="flex justify-end">
                <Button
                    variant="outline"
                    size="sm"
                    icon={<Filter size={13} />}
                    label="Monitoring Filter"
                    onClick={() => setOpen(true)}
                />
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Filter size={16} className="text-primary" /> Monitoring Filter
                        </DialogTitle>
                        <DialogDescription>
                            Only the ports and processes you leave checked are reported for this
                            server and pinged. Everything checked means the agent's noise filter
                            decides.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[60vh] overflow-y-auto pr-1 flex flex-col gap-6">
                        <div>
                            <label className="flex items-center gap-2 text-xs font-medium text-foreground mb-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={allPorts}
                                    onChange={toggleAllPorts}
                                    className="accent-primary cursor-pointer"
                                />
                                Ports ({allPorts ? "all" : `${portSel?.size ?? 0} of ${portOptions.length}`})
                            </label>
                            {portOptions.length > 0 ? (
                                <div className="flex flex-col gap-1.5 mt-2">
                                    {portOptions.map((o) => {
                                        const on = portSel?.has(o.port) ?? allPorts;
                                        return (
                                            <button
                                                key={o.port}
                                                onClick={() => togglePort(o.port)}
                                                className={cn(
                                                    "flex items-center gap-3 px-3 py-2 rounded-md border text-left text-xs transition-colors cursor-pointer",
                                                    on
                                                        ? "bg-primary/15 border-primary/30 text-foreground"
                                                        : "bg-muted/30 border-border/40 text-muted-foreground hover:text-foreground",
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        "size-4 rounded border flex items-center justify-center shrink-0",
                                                        on
                                                            ? "bg-primary border-primary text-primary-foreground"
                                                            : "bg-background border-border",
                                                    )}
                                                >
                                                    {on && <Check size={11} />}
                                                </span>
                                                <span className="font-semibold text-sm">{o.port}</span>
                                                <span className="truncate">{o.descriptor}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">No ports reported yet.</p>
                            )}
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-xs font-medium text-foreground mb-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={allProcs}
                                    onChange={toggleAllProcs}
                                    className="accent-primary cursor-pointer"
                                />
                                Processes ({allProcs ? "all" : `${procSel?.size ?? 0} of ${procOptions.length}`})
                            </label>
                            {procOptions.length > 0 ? (
                                <div className="flex flex-col gap-1.5 mt-2">
                                    {procOptions.map((o) => {
                                        const on = procSel?.has(o.name) ?? allProcs;
                                        return (
                                            <button
                                                key={o.name}
                                                onClick={() => toggleProc(o.name)}
                                                className={cn(
                                                    "flex items-center gap-3 px-3 py-2 rounded-md border text-left text-xs transition-colors cursor-pointer",
                                                    on
                                                        ? "bg-primary/15 border-primary/30 text-foreground"
                                                        : "bg-muted/30 border-border/40 text-muted-foreground hover:text-foreground",
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        "size-4 rounded border flex items-center justify-center shrink-0",
                                                        on
                                                            ? "bg-primary border-primary text-primary-foreground"
                                                            : "bg-background border-border",
                                                    )}
                                                >
                                                    {on && <Check size={11} />}
                                                </span>
                                                <span className="font-semibold text-sm">{o.name}</span>
                                                <span className="truncate">{o.descriptor}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">No processes reported yet.</p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <div className="flex w-full items-center justify-between gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                label="Reset to all"
                                onClick={() => {
                                    setPortSel(null);
                                    setProcSel(null);
                                }}
                            />
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" label="Cancel" onClick={() => setOpen(false)} />
                                <Button
                                    size="sm"
                                    label={saving ? "Saving..." : "Save"}
                                    disabled={!dirty || saving}
                                    onClick={save}
                                />
                            </div>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

export function MetricsTab({
    timeSpan,
    setTimeSpan,
    timeSpanArgs,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    customUnitStr,
    setCustomUnitStr,
    uuid,
}: {
    timeSpan: TimeSpan;
    setTimeSpan: (value: TimeSpan) => void;
    timeSpanArgs: TimeSpanArgs | undefined;
    customFrom: string;
    setCustomFrom: (value: string) => void;
    customTo: string;
    setCustomTo: (value: string) => void;
    customUnitStr: string;
    setCustomUnitStr: (value: string) => void;
    uuid: string;
}) {
    const { server } = useServerDetailContext();
    const queryClient = useQueryClient();

    return (
        <div className="flex flex-col gap-6 p-4 bg-card border border-t-0 border-border/60 rounded-b-lg">
            <MonitoringFilter uuid={uuid} />
            <div className="flex flex-col gap-6">
                <div className="bg-card/50 border border-border/50 rounded-xl p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Cpu size={16} className="text-primary" /> Top Processes
                    </h3>
                    {server?.processes && server.processes.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="text-muted-foreground border-b border-border/30">
                                        <th className="pb-2 font-medium">
                                            PID
                                        </th>
                                        <th className="pb-2 font-medium">
                                            Name
                                        </th>
                                        <th className="pb-2 font-medium text-right">
                                            CPU
                                        </th>
                                        <th className="pb-2 font-medium text-right">
                                            RAM
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20">
                                    {server.processes.map((p) => (
                                        <tr
                                            key={p.pid}
                                            className="hover:bg-muted/10"
                                        >
                                            <td className="py-2 text-muted-foreground">
                                                {p.pid}
                                            </td>
                                            <td
                                                className="py-2 font-medium text-foreground max-w-30 truncate"
                                                title={p.name}
                                            >
                                                {p.name}
                                            </td>
                                            <td className="py-2 text-right text-foreground">
                                                {p.cpu != null
                                                    ? `${p.cpu.toFixed(1)}%`
                                                    : "-"}
                                            </td>
                                            <td className="py-2 text-right text-foreground">
                                                {p.memory != null
                                                    ? `${p.memory.toFixed(1)} MB`
                                                    : "-"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground py-4 text-center">
                            No processes reported.
                        </p>
                    )}
                </div>

                <div className="bg-card/50 border border-border/50 rounded-xl p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Link2 size={16} className="text-primary" /> Exposed
                        Ports
                    </h3>
                    {server?.ports && server.ports.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="text-muted-foreground border-b border-border/30">
                                        <th className="pb-2 font-medium">
                                            Port
                                        </th>
                                        <th className="pb-2 font-medium">
                                            Proto
                                        </th>
                                        <th className="pb-2 font-medium">
                                            Process
                                        </th>
                                        <th className="pb-2 font-medium text-right">
                                            State
                                        </th>
                                        <th className="pb-2 font-medium text-right">
                                            Ping
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20">
                                    {server.ports.map((p, idx: number) => (
                                        <tr
                                            key={idx}
                                            className="hover:bg-muted/10"
                                        >
                                            <td className="py-2 font-semibold text-foreground">
                                                {p.port}
                                            </td>
                                            <td className="py-2 text-muted-foreground uppercase">
                                                {p.protocol}
                                            </td>
                                            <td className="py-2 text-foreground font-medium">
                                                {p.process || "unknown"}
                                            </td>
                                            <td className="py-2 text-right flex items-center justify-end gap-1.5">
                                                <span
                                                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${p.state === "listening" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"}`}
                                                >
                                                    {p.state}
                                                </span>
                                            </td>
                                            <td className="py-2 text-right text-foreground">
                                                {p.ping_status === "offline"
                                                    ? "unreachable"
                                                    : p.ping_status === "online"
                                                      ? `${p.ping_time}ms`
                                                      : "-"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground py-4 text-center">
                            No open exposed ports.
                        </p>
                    )}
                </div>
            </div>

            <div className="pt-6 border-t border-border/60">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground">
                        System Resources
                    </h3>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            icon={<RefreshCw size={13} />}
                            label="Refresh"
                            onClick={() =>
                                queryClient.invalidateQueries({
                                    queryKey: ["server", uuid],
                                })
                            }
                        />
                        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-md border border-border/50">
                            {(
                                [
                                    "1H",
                                    "1D",
                                    "1W",
                                    "1M",
                                    "3M",
                                    "6M",
                                ] as TimeSpan[]
                            ).map((span) => (
                                <button
                                    key={span}
                                    onClick={() => setTimeSpan(span)}
                                    className={cn(
                                        "px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer",
                                        timeSpan === span
                                            ? "bg-background text-foreground shadow-sm border border-border"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                                    )}
                                >
                                    {span}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-md border border-border/50">
                            {(
                                [
                                    "1Y",
                                    "3Y",
                                    "6Y",
                                    "9Y",
                                    "12Y",
                                    "Custom",
                                ] as TimeSpan[]
                            ).map((span) => (
                                <button
                                    key={span}
                                    onClick={() => setTimeSpan(span)}
                                    className={cn(
                                        "px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer",
                                        timeSpan === span
                                            ? "bg-background text-foreground shadow-sm border border-border"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                                    )}
                                >
                                    {span}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {timeSpan === "Custom" && (
                    <div className="flex flex-wrap items-center gap-4 mb-6 bg-muted/20 p-3 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-muted-foreground font-medium">
                                From:
                            </label>
                            <input
                                type="datetime-local"
                                value={customFrom}
                                onChange={(e) => setCustomFrom(e.target.value)}
                                className="bg-background border border-border rounded-md px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 dark:[&::-webkit-calendar-picker-indicator]:invert"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-muted-foreground font-medium">
                                Until:
                            </label>
                            <input
                                type="datetime-local"
                                value={customTo}
                                onChange={(e) => setCustomTo(e.target.value)}
                                className="bg-background border border-border rounded-md px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 dark:[&::-webkit-calendar-picker-indicator]:invert"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-muted-foreground font-medium">
                                Unit:
                            </label>
                            <select
                                value={customUnitStr}
                                onChange={(e) =>
                                    setCustomUnitStr(e.target.value)
                                }
                                className="bg-background border border-border rounded-md px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                            >
                                <option value="auto">Auto</option>
                                <option
                                    value="1"
                                    disabled={(timeSpanArgs?.minUnit ?? 1) > 1}
                                >
                                    Minute
                                </option>
                                <option
                                    value="2"
                                    disabled={(timeSpanArgs?.minUnit ?? 1) > 2}
                                >
                                    Hour
                                </option>
                                <option
                                    value="3"
                                    disabled={(timeSpanArgs?.minUnit ?? 1) > 3}
                                >
                                    Day
                                </option>
                                <option
                                    value="4"
                                    disabled={(timeSpanArgs?.minUnit ?? 1) > 4}
                                >
                                    Week
                                </option>
                                <option
                                    value="5"
                                    disabled={(timeSpanArgs?.minUnit ?? 1) > 5}
                                >
                                    Month
                                </option>
                            </select>
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-1 gap-6">
                    {CHARTS.map((cfg) => (
                        <ServerStatChart
                            key={cfg.dataKey}
                            title={cfg.title}
                            data={server?.stats || []}
                            dataKey={cfg.dataKey}
                            color={cfg.color}
                            unit={cfg.unit}
                            yDomain={cfg.yDomain}
                            timeSpan={timeSpan}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
