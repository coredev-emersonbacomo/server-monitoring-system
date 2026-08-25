import { useState } from "react";
import { Section, SubSection, InlineCode, Callout } from "./Section";
import { cn } from "@/lib/utils";

type Env = "prod" | "dev";

interface FakeServer {
    name: string;
    status: "online" | "offline";
    ports: { port: number; proto: string; checked: boolean; open: boolean }[];
    processes: { name: string; pid: number; cpu: string; checked: boolean }[];
}

const FAKE_ENVS: Record<Env, FakeServer[]> = {
    prod: [
        {
            name: "db-01",
            status: "online",
            ports: [
                { port: 5432, proto: "tcp", checked: true, open: true },
                { port: 6379, proto: "tcp", checked: true, open: true },
                { port: 5433, proto: "tcp", checked: false, open: false },
            ],
            processes: [
                { name: "postgres", pid: 1204, cpu: "12.4%", checked: true },
                { name: "redis-server", pid: 893, cpu: "1.2%", checked: true },
                { name: "node", pid: 2280, cpu: "0.3%", checked: false },
            ],
        },
        {
            name: "api-01",
            status: "online",
            ports: [
                { port: 443, proto: "tcp", checked: true, open: true },
                { port: 8080, proto: "tcp", checked: false, open: false },
            ],
            processes: [
                { name: "php-fpm", pid: 411, cpu: "8.1%", checked: true },
                { name: "nginx", pid: 399, cpu: "0.9%", checked: true },
            ],
        },
    ],
    dev: [
        {
            name: "dev-01",
            status: "offline",
            ports: [
                { port: 3306, proto: "tcp", checked: true, open: false },
            ],
            processes: [
                { name: "mysqld", pid: 511, cpu: "0.0%", checked: true },
            ],
        },
    ],
};

function ServerCard({ server }: { server: FakeServer }) {
    const checkedPorts = server.ports.filter((p) => p.checked);
    const reportedPorts = server.ports.filter((p) => p.checked && p.open);
    const checkedProcs = server.processes.filter((p) => p.checked);

    return (
        <div className="rounded-lg border border-border/50 bg-card p-3">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground font-mono">
                    {server.name}
                </span>
                <span
                    className={cn(
                        "px-1.5 py-0.5 rounded-full text-[10px] font-medium border capitalize",
                        server.status === "online"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                            : "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
                    )}
                >
                    {server.status}
                </span>
            </div>

            <p className="text-[11px] text-muted-foreground mb-1.5">
                Port filter ({checkedPorts.length}/{server.ports.length} checked)
            </p>
            <div className="flex flex-wrap gap-1 mb-3">
                {server.ports.map((p) => (
                    <span
                        key={p.port}
                        className={cn(
                            "px-1.5 py-0.5 rounded font-mono text-[10px] border",
                            p.checked
                                ? "bg-primary/10 text-primary border-primary/30"
                                : "bg-muted/40 text-muted-foreground border-border/40 line-through",
                        )}
                    >
                        {p.port}/{p.proto}
                    </span>
                ))}
            </div>

            <p className="text-[11px] text-muted-foreground mb-1.5">
                Reported ports (checked + open)
            </p>
            <div className="flex flex-wrap gap-1 mb-3">
                {reportedPorts.length ? (
                    reportedPorts.map((p) => (
                        <span
                            key={p.port}
                            className="px-1.5 py-0.5 rounded font-mono text-[10px] border bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                        >
                            {p.port} ✓
                        </span>
                    ))
                ) : (
                    <span className="text-[10px] text-muted-foreground">
                        — none —
                    </span>
                )}
            </div>

            <p className="text-[11px] text-muted-foreground mb-1.5">
                Reported processes ({checkedProcs.length} of{" "}
                {server.processes.length})
            </p>
            <div className="space-y-1">
                {checkedProcs.map((proc) => (
                    <div
                        key={proc.name}
                        className="flex items-center justify-between font-mono text-[10px] text-foreground bg-background border border-border/40 rounded px-1.5 py-0.5"
                    >
                        <span>{proc.name}</span>
                        <span className="text-muted-foreground">
                            pid {proc.pid} · {proc.cpu}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MultiServerDemo() {
    const [env, setEnv] = useState<Env>("prod");

    return (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-xs font-medium text-muted-foreground mr-1">
                    Scenario:
                </span>
                <button
                    type="button"
                    onClick={() => setEnv("prod")}
                    className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer",
                        env === "prod"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-muted-foreground border-border/60 hover:bg-muted",
                    )}
                >
                    PROD — 2 servers, 1 agent
                </button>
                <button
                    type="button"
                    onClick={() => setEnv("dev")}
                    className={cn(
                        "px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer",
                        env === "dev"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-muted-foreground border-border/60 hover:bg-muted",
                    )}
                >
                    DEV — 1 server, offline
                </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FAKE_ENVS[env].map((server) => (
                    <ServerCard key={server.name} server={server} />
                ))}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
                One agent installation owns all of its servers. Each server has
                its own filter; the agent applies each server's filter to a
                single per-cycle collection, and the backend ping job probes
                only the checked (filter-included) TCP ports.
            </p>
        </div>
    );
}

export function DocsAgentMonitoringContent() {
    return (
        <>
            <Section title="The monitoring loop">
                <p>
                    Every owned server is monitored by one agent loop. On each
                    heartbeat tick the agent collects metrics, processes and
                    open ports <strong>once</strong>, then sends a{" "}
                    <strong>single aggregated heartbeat</strong> for all of its
                    servers: usage stats travel once at the top level, and each
                    server contributes its own partition carrying that server's
                    filtered processes and ports — so adding a server costs one
                    extra partition inside the same request, not a second
                    collector or a second request.
                </p>
                <MultiServerDemo />
            </Section>

            <Section title="What is collected">
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>CPU, memory, disk, network, uptime</strong> —
                        current usage stats sent with every heartbeat.
                    </li>
                    <li>
                        <strong>Processes</strong> — grouped by name (Task
                        Manager style): CPU and memory summed across instances,
                        PIDs collected and sorted, lowest PID kept as the
                        representative row. The list is capped and sorted by CPU
                        descending.
                    </li>
                    <li>
                        <strong>Open database ports</strong> — listening TCP/UDP
                        ports.
                    </li>
                    <li>
                        <strong>Agent config</strong> — current heartbeat
                        interval and agent version, so the backend can detect
                        drift.
                    </li>
                </ul>
                <p>
                    The full discoverable set ({" "}
                    <InlineCode>available_processes</InlineCode> /{" "}
                    <InlineCode>available_ports</InlineCode>) is sent{" "}
                    <strong>only when it changes</strong> — the agent keeps a
                    signature of the last set and skips re-sending it otherwise.
                    This is the noise-filtered inventory the backend shows in
                    the monitoring filter UI.
                </p>
            </Section>

            <Section title="Port & process filters">
                <p>
                    Each server has a <InlineCode>port_filter</InlineCode> and{" "}
                    <InlineCode>process_filter</InlineCode> on its record. The
                    semantics are:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>
                            <InlineCode>null</InlineCode> (all checked)
                        </strong>{" "}
                        — report everything the agent's built-in noise filter
                        allows.
                    </li>
                    <li>
                        <strong>an array</strong> — the exact set of
                        ports/processes to report;{" "}
                        <strong>an empty array</strong> filters to nothing.
                    </li>
                </ul>
                <p>
                    Filters are edited per server with the{" "}
                    <strong>Monitoring Filter</strong> dialog on the server's
                    Metrics tab (one for ports, one for processes). Saving PATCHes{" "}
                    <InlineCode>
                        {"/v1/clients/{clientUuid}/servers/{serverUuid}/monitoring"}
                    </InlineCode>
                    , which stores the filter and broadcasts an{" "}
                    <InlineCode>AgentConfigUpdated</InlineCode> event over the
                    WebSocket control channel so the agent applies it in memory
                    immediately.
                </p>
                <SubSection title="How the agent gets filters">
                    <p>
                        Filters are <strong>not</strong> returned in heartbeat
                        responses anymore. They arrive two ways:
                    </p>
                    <ol className="list-decimal pl-5 space-y-1.5">
                        <li>
                            <strong>On auth/startup</strong> — the
                            challenge-response auth response carries every owned
                            server's filter.
                        </li>
                        <li>
                            <strong>Over the WebSocket control channel</strong>{" "}
                            — a <InlineCode>config.update</InlineCode> event
                            pushes a changed filter live. On reconnect the agent
                            refreshes its session, restoring the freshest filters
                            from the auth response.
                        </li>
                    </ol>
                </SubSection>
            </Section>

            <Section title="Backend port ping">
                <p>
                    The backend <strong>probes</strong> exposed ports itself, on
                    the port-ping interval (default 60s), via the{" "}
                    <InlineCode>PingServerPorts</InlineCode> queued job. It uses
                    the same filter semantics as the agent:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <InlineCode>null</InlineCode> filter — probe{" "}
                        <em>every</em> TCP port the agent reports.
                    </li>
                    <li>
                        non-null list — probe exactly the SecOps-checked ports
                        (empty = ping nothing).
                    </li>
                </ul>
                <p>
                    Each probe opens a TCP connection with a 2-second timeout and
                    records{" "}
                    <InlineCode>ping_status</InlineCode> (
                    <InlineCode>online</InlineCode>/<InlineCode>offline</InlineCode>{" "}
                    ) and <InlineCode>ping_time</InlineCode> (milliseconds) on
                    the port. Results feed the alert engine's{" "}
                    <InlineCode>ports_ping</InlineCode> metric, so a checked port
                    going down can trigger alerts.
                </p>
                <Callout>
                    Only <strong>checked</strong> (filter-included) TCP ports are
                    pinged. Unchecked ports are never probed, which keeps the
                    ping traffic scoped to what SecOps actually cares about.
                </Callout>
            </Section>

            <Section title="The heartbeat response">
                <p>
                    Each heartbeat returns a small control payload the agent acts
                    on:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>heartbeat_interval</strong> — a new interval to
                        adopt immediately (used to push global settings changes).
                    </li>
                    <li>
                        <strong>configuration.version</strong> — a bump tells the
                        agent its view of configuration is stale.
                    </li>
                    <li>
                        <strong>pending_update</strong> — a new agent version;
                        the agent updates its binary and restarts, adopting any
                        new heartbeat interval included with it.
                    </li>
                    <li>
                        <strong>pending_commands</strong> — backend-issued
                        commands to execute; results are acknowledged in the
                        next aggregated heartbeat.
                    </li>
                    <li>
                        <strong>revoked_server_uuids</strong> — servers that are
                        decommissioned, reassigned, or no longer owned; the
                        agent removes them from its monitored set instead of
                        retrying forever.
                    </li>
                </ul>
            </Section>

            <Section title="Offline detection">
                <p>
                    A server is marked <em>offline</em> when no heartbeat arrives
                    within the offline threshold (Settings → Agent Settings,
                    default 15s; must be ≥ the heartbeat interval, default 5s).
                    The backend never lets a decommissioned or archived agent
                    resurrect a server: heartbeats and channel auth are refused
                    for servers whose agent is deleted or archived.
                </p>
            </Section>
        </>
    );
}