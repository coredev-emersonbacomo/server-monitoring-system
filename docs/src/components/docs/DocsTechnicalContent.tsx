import {
    Section,
    SubSection,
    InlineCode,
    Callout,
    CodeBlock,
} from "./Section";
import { Link } from "react-router-dom";

export function DocsArchitectureContent() {
    return (
        <>
            <Section title="System components">
                <p>
                    The system is a monorepo. The backend is Laravel 13, the
                    frontend is a React 19 SPA (in{" "}
                    <InlineCode>frontend/</InlineCode>), the agent is a Go
                    daemon (in <InlineCode>resources/agent/go</InlineCode>),
                    and storage is PostgreSQL with TimescaleDB.
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Laravel backend</strong> - REST API (JWT auth),
                        Reverb WebSockets, the node-based alert engine, queued
                        jobs, the scheduler, and Typst report compilation.
                    </li>
                    <li>
                        <strong>React SPA</strong> - the dashboard and
                        management UI, talking to the API through an
                        OpenAPI-generated typed client.
                    </li>
                    <li>
                        <strong>Go agent</strong> - installed on monitored
                        servers; collects metrics, heartbeats, executes
                        commands, and self-updates.
                    </li>
                    <li>
                        <strong>PostgreSQL + TimescaleDB</strong> - relational
                        data plus time-series aggregates for charts and
                        reports.
                    </li>
                    <li>
                        <strong>Redis</strong> - cache and broadcast support.
                    </li>
                    <li>
                        <strong>Reverb</strong> - Pusher-compatible WebSocket
                        server for realtime updates.
                    </li>
                </ul>
            </Section>

            <Section title="Data flow">
                <p>
                    The monitoring loop is straightforward:
                </p>
                <ol className="list-decimal pl-5 space-y-1.5">
                    <li>
                        The <strong>agent</strong> on each server POSTs
                        heartbeats (CPU, memory, disk, network, processes,
                        open ports) every heartbeat interval.
                    </li>
                    <li>
                        The                         <strong>backend</strong> stores raw updates in{" "}
                        <InlineCode>server_updates</InlineCode> and relays the
                        latest stat to the browser over the{" "}
                        <InlineCode>{"server.{uuid}"}</InlineCode> channel.
                    </li>
                    <li>
                        The <strong>scheduler</strong> (every minute) runs{" "}
                        <InlineCode>system:monitor</InlineCode>, dispatching a
                        MonitorServer job per server that evaluates the alert
                        config and transitions status.
                    </li>
                    <li>
                        The <strong>SPA</strong> receives status/stat events
                        over WebSockets and updates the dashboard and charts
                        live.
                    </li>
                </ol>
            </Section>

            <Section title="Authentication & sessions">
                <p>
                    The SPA authenticates with JWT (HS256). Access tokens last
                    15 minutes; refresh tokens last 30 days and rotate. A
                    refresh token reuse detection marks sessions compromised.
                    Sessions are tracked server-side (Sessions & Devices page)
                    and can be revoked individually or globally.
                </p>
            </Section>

            <Section title="Alert scopes">
                <p>
                    Alert configs are stored by slug:{" "}
                    <InlineCode>alerts</InlineCode> (global),{" "}
                    <InlineCode>{"client_{uuid}"}</InlineCode>, and{" "}
                    <InlineCode>{"server_{uuid}"}</InlineCode>. Each server
                    resolves its config by scope: server config → client config
                    → global fallback. See the Alerting System section for the
                    engine internals.
                </p>
            </Section>

            <Section title="Repository layout">
                <p>
                    The codebase is a monorepo. Run everything from the repo root
                    (<InlineCode>npm run dev</InlineCode>, <InlineCode>npm test</InlineCode>):
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <InlineCode>app/</InlineCode> - Laravel backend (API,
                        agents, alerts, provisioning, reports).
                    </li>
                    <li>
                        <InlineCode>frontend/</InlineCode> - React dashboard +
                        embedded docs viewer (Vite, port 5173).
                    </li>
                    <li>
                        <InlineCode>docs/</InlineCode> - standalone docs site,
                        local-only (port 5174, never hosted).
                    </li>
                    <li>
                        <InlineCode>resources/agent/go/</InlineCode> - the Go
                        monitoring agent source.
                    </li>
                    <li>
                        <InlineCode>scripts/entry.js</InlineCode> - dev/prod process
                        manager (<InlineCode>npm run dev</InlineCode> /{" "}
                        <InlineCode>npm start</InlineCode>).
                    </li>
                    <li>
                        <InlineCode>scripts/tunnel.js</InlineCode> - Cloudflare quick
                        tunnel (<InlineCode>npm run tunnel</InlineCode>).
                    </li>
                    <li>
                        <InlineCode>scripts/ngrok.js</InlineCode> /{" "}
                        <InlineCode>scripts/ngrok-build.js</InlineCode> - HMR / static
                        tunnels (<InlineCode>npm run ngrok</InlineCode> /{" "}
                        <InlineCode>npm run ngrok:build</InlineCode>).
                    </li>
                    <li>
                        <InlineCode>scripts/reset-db.js</InlineCode> - dual-workflow DB
                        reset (<InlineCode>npm run resetdb</InlineCode>).
                    </li>
                    <li>
                        <InlineCode>Dockerfile</InlineCode> - multi-stage (<InlineCode>dev</InlineCode>
                        {" "}/<InlineCode>prod</InlineCode> targets).
                    </li>
                    <li>
                        <InlineCode>compose.yaml</InlineCode> /{" "}
                        <InlineCode>compose.prod.yaml</InlineCode> - dev / production
                        stacks.
                    </li>
                    <li>
                        <InlineCode>TODO/</InlineCode> - work backlog (source of truth
                        for pending work).
                    </li>
                    <li>
                        <InlineCode>docs/architecture/</InlineCode> - ADRs (read before
                        changing architecture).
                    </li>
                </ul>
            </Section>
        </>
    );
}

export function DocsAdrContent() {
    return (
        <>
            <Section title="Architecture Decision Records">
                <p>
                    Architecture Decision Records (ADRs) capture significant, durable
                    architectural choices behind the system  -  including the technical
                    context, evaluated options, chosen solutions, and permanent constraints.
                    The canonical source files live in the repository under{" "}
                    <InlineCode>docs/architecture/</InlineCode>.
                </p>
                <p>
                    Unlike temporary implementation plans in <InlineCode>TODO/</InlineCode>,
                    ADRs describe <strong>permanent architectural truth</strong>. Developers
                    and automated agents must read relevant ADRs before making changes to agent
                    topology, telemetry pipelines, audit storage, or delivery semantics.
                </p>
                <Callout type="tip" title="Source of Truth">
                    Every architectural change that alters data ownership, storage schema,
                    process lifecycles, or network contracts requires an ADR. Existing ADRs
                    are never rewritten away; superseded decisions are marked with references
                    to their successor.
                </Callout>
            </Section>

            <Section title="ADR Index">
                <p>
                    The table below provides a quick reference to all approved architectural
                    decisions in the repository:
                </p>
                <div className="overflow-x-auto my-4">
                    <table className="w-full text-sm border border-border/40 rounded-lg overflow-hidden">
                        <thead className="bg-muted/30">
                            <tr>
                                <th className="text-left px-3 py-2 font-medium text-foreground">
                                    Record
                                </th>
                                <th className="text-left px-3 py-2 font-medium text-foreground">
                                    Status
                                </th>
                                <th className="text-left px-3 py-2 font-medium text-foreground">
                                    Subsystem
                                </th>
                                <th className="text-left px-3 py-2 font-medium text-foreground">
                                    Summary Decision
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            <tr>
                                <td className="px-3 py-2.5 font-mono text-xs font-semibold text-foreground whitespace-nowrap">
                                    <a
                                        href="#adr-0001-agent-server-ownership-model-and-agent-self-bootstrap"
                                        className="hover:underline text-primary"
                                    >
                                        ADR-0001
                                    </a>
                                </td>
                                <td className="px-3 py-2.5 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                        Partially Superseded
                                    </span>
                                </td>
                                <td className="px-3 py-2.5 text-xs font-medium text-foreground">
                                    Agent / Core
                                </td>
                                <td className="px-3 py-2.5 text-xs text-muted-foreground">
                                    1:N server ownership model (<InlineCode>servers.agent_id</InlineCode>),
                                    runtime port/process filters, and auto-bootstrap config.
                                </td>
                            </tr>
                            <tr>
                                <td className="px-3 py-2.5 font-mono text-xs font-semibold text-foreground whitespace-nowrap">
                                    <a
                                        href="#adr-0002-single-agent-per-physical-computer"
                                        className="hover:underline text-primary"
                                    >
                                        ADR-0002
                                    </a>
                                </td>
                                <td className="px-3 py-2.5 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                        Accepted
                                    </span>
                                </td>
                                <td className="px-3 py-2.5 text-xs font-medium text-foreground">
                                    Agent Lifecycle
                                </td>
                                <td className="px-3 py-2.5 text-xs text-muted-foreground">
                                    Singleton OS service per host, detect-and-attach installer,
                                    split Detach Server vs. Uninstall Agent, aggregated heartbeat.
                                </td>
                            </tr>
                            <tr>
                                <td className="px-3 py-2.5 font-mono text-xs font-semibold text-foreground whitespace-nowrap">
                                    <a
                                        href="#adr-0003-per-interface-network-traffic-with-checklist-filter"
                                        className="hover:underline text-primary"
                                    >
                                        ADR-0003
                                    </a>
                                </td>
                                <td className="px-3 py-2.5 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                        Accepted
                                    </span>
                                </td>
                                <td className="px-3 py-2.5 text-xs font-medium text-foreground">
                                    Metrics / Telemetry
                                </td>
                                <td className="px-3 py-2.5 text-xs text-muted-foreground">
                                    Per-interface network stats (Ethernet, Wi-Fi, VPN), TimescaleDB
                                    hypertable + CAGGs, delta rates, and checklist filters.
                                </td>
                            </tr>
                            <tr>
                                <td className="px-3 py-2.5 font-mono text-xs font-semibold text-foreground whitespace-nowrap">
                                    <a
                                        href="#adr-0004-audit-subsystem-file-activity-agent-lifecycle"
                                        className="hover:underline text-primary"
                                    >
                                        ADR-0004
                                    </a>
                                </td>
                                <td className="px-3 py-2.5 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                        Accepted
                                    </span>
                                </td>
                                <td className="px-3 py-2.5 text-xs font-medium text-foreground">
                                    Audit / Security
                                </td>
                                <td className="px-3 py-2.5 text-xs text-muted-foreground">
                                    Two dedicated audit tables, watched paths via auth/WS config updates,
                                    durable JSON-lines queue, backend timeout disconnect detection.
                                </td>
                            </tr>
                            <tr>
                                <td className="px-3 py-2.5 font-mono text-xs font-semibold text-foreground whitespace-nowrap">
                                    <a
                                        href="#adr-0005-agent-delivery-semantics-bounded-heartbeat-retry-no-metric-backfill"
                                        className="hover:underline text-primary"
                                    >
                                        ADR-0005
                                    </a>
                                </td>
                                <td className="px-3 py-2.5 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                        Accepted
                                    </span>
                                </td>
                                <td className="px-3 py-2.5 text-xs font-medium text-foreground">
                                    Reliability / Pipeline
                                </td>
                                <td className="px-3 py-2.5 text-xs text-muted-foreground">
                                    Tick-bounded heartbeat retry, no synthetic metric backfill
                                    (outage gaps preserved), durable queue for audit events only.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </Section>

            <Section title="ADR-0001: Agent-Server Ownership Model and Agent Self-Bootstrap">
                <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        Partially Superseded by ADR-0002
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                        docs/architecture/0001-agent-server-relationship.md
                    </span>
                </div>
                <Callout type="warning" title="Superseded Portions">
                    The data model, authentication, heartbeat validation, and filter
                    decisions in ADR-0001 remain in active force. The installer, per-instance
                    service unit, and <InlineCode>{"instances/<uuid>"}</InlineCode> on-disk
                    layout portions were superseded by ADR-0002.
                </Callout>

                <SubSection title="Context & Problem">
                    <p>
                        The monitoring agent was originally architected as a strict 1:1
                        relationship: <InlineCode>agents.server_id</InlineCode> was a required foreign
                        key, with a unique partial index enforcing one active agent per server.
                        Registering the same installation UUID for an additional server triggered
                        a 409 conflict, making it impossible for one agent on a machine to monitor
                        multiple logical server environments.
                    </p>
                    <p>
                        Additionally, field installations reported missing{" "}
                        <InlineCode>config.json</InlineCode> and <InlineCode>agent.log</InlineCode> files.
                        Investigation showed the agent attempted to load configuration relative to
                        the executable directory inside <InlineCode>Program Files</InlineCode>, which
                        is read-only for standard users and LocalSystem services, resulting in silent
                        startup termination.
                    </p>
                </SubSection>

                <SubSection title="Key Decisions">
                    <ul className="list-disc pl-5 space-y-2">
                        <li>
                            <strong>1:N Ownership:</strong> Added a nullable{" "}
                            <InlineCode>servers.agent_id</InlineCode> foreign key as canonical ownership.
                            One agent can own many servers. <InlineCode>agents.server_id</InlineCode>{" "}
                            was made nullable and retained purely as a backward-compatible pointer.
                        </li>
                        <li>
                            <strong>Find-or-Create Registration:</strong> Re-registering with an
                            existing <InlineCode>installation_uuid</InlineCode> links the new server
                            to the existing agent rather than failing with 409.
                        </li>
                        <li>
                            <strong>In-Memory Noise Filters:</strong> <InlineCode>servers.port_filter</InlineCode>{" "}
                            and <InlineCode>servers.process_filter</InlineCode> define per-server
                            SecOps spotlights. Stored in the backend database and cached in the agent's
                            runtime memory (<InlineCode>map[serverUUID]ServerRuntimeConfig</InlineCode>),
                            allowing isolated filtering per monitored environment.
                        </li>
                        <li>
                            <strong>Agent Self-Bootstrap:</strong> When <InlineCode>config.json</InlineCode>{" "}
                            is missing on first run, the agent automatically initializes a minimal default
                            bootstrap configuration in machine-writable storage (
                            <InlineCode>C:\ProgramData\MonitorAgent\</InlineCode> on Windows,{" "}
                            <InlineCode>/var/lib/monitor-agent/</InlineCode> on Linux) instead of
                            crashing silently.
                        </li>
                    </ul>
                </SubSection>
            </Section>

            <Section title="ADR-0002: Single Agent per Physical Computer">
                <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        Accepted
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                        docs/architecture/0002-singleton-agent-per-computer.md
                    </span>
                </div>

                <SubSection title="Context & Problem">
                    <p>
                        Although ADR-0001 resolved the database model for 1:N servers, the
                        installation scripts still generated a fresh installation UUID on every
                        execution, created separate service units (e.g.{" "}
                        <InlineCode>{"monitor-agent@<uuid>.service"}</InlineCode>), and wrote to isolated
                        per-instance subdirectories. Running the installer multiple times on the
                        same host created multiple competing agent services, while running the
                        uninstaller risked deleting all agent instances simultaneously.
                    </p>
                </SubSection>

                <SubSection title="Key Decisions">
                    <ul className="list-disc pl-5 space-y-2">
                        <li>
                            <strong>Singleton OS Service:</strong> Exactly one agent service per physical
                            machine (<InlineCode>MonitorAgent</InlineCode> on Windows,{" "}
                            <InlineCode>monitor-agent.service</InlineCode> on Linux), one binary path,
                            one installation UUID, and one private key pair.
                        </li>
                        <li>
                            <strong>Detect-and-Attach Installer:</strong> When executed, the install
                            script first checks if the service already exists. If found, it reads the
                            existing installation ID and attaches the newly provisioned server via{" "}
                            <InlineCode>/api/v1/register</InlineCode> using the provision token, without
                            creating duplicate services or rotating keys.
                        </li>
                        <li>
                            <strong>Private Key in OS Keystore:</strong> Private keys are never stored
                            on disk in plaintext. On Windows, keys live in the NCrypt/CNG store (
                            <InlineCode>MonitorAgentIdentity</InlineCode>); on Linux, in a{" "}
                            <InlineCode>0600</InlineCode> file owned by the <InlineCode>monitor</InlineCode>{" "}
                            user.
                        </li>
                        <li>
                            <strong>Two-Tier Lifecycle:</strong>
                            <ul className="list-disc pl-5 mt-1 space-y-1 text-xs md:text-sm">
                                <li>
                                    <em>Detach Server:</em> Removes an individual server association
                                    (<InlineCode>agent_id = null</InlineCode>,{" "}
                                    <InlineCode>status = agent_uninstalled</InlineCode>). The agent
                                    and service remain running for any remaining servers.
                                </li>
                                <li>
                                    <em>Uninstall Agent:</em> Decommissions the whole host only when zero
                                    monitored servers remain, stopping the OS service and revoking the key.
                                </li>
                            </ul>
                        </li>
                        <li>
                            <strong>Aggregated Heartbeat:</strong> The agent sends one consolidated{" "}
                            <InlineCode>POST /api/v1/agent/heartbeat</InlineCode> per tick with host-level
                            metrics (<InlineCode>cpu, memory, disk, network</InlineCode>) once, along with
                            a collection of per-server partitions, reducing N network requests to 1.
                        </li>
                    </ul>
                </SubSection>
            </Section>

            <Section title="ADR-0003: Per-Interface Network Traffic with Checklist Filter">
                <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        Accepted
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                        docs/architecture/0003-per-interface-network-traffic.md
                    </span>
                </div>

                <SubSection title="Context & Problem">
                    <p>
                        Previously, the Go agent gathered network metrics strictly from Ethernet adapters
                        and collapsed all interface counters into aggregate{" "}
                        <InlineCode>server_updates.network_rbytes</InlineCode> and{" "}
                        <InlineCode>network_tbytes</InlineCode> sums. Wi-Fi, VPN adapters, and virtual
                        interfaces were omitted, and operators could not view individual adapter
                        throughput or filter noisy secondary interfaces.
                    </p>
                </SubSection>

                <SubSection title="Key Decisions">
                    <ul className="list-disc pl-5 space-y-2">
                        <li>
                            <strong>Universal Interface Collection:</strong> Expanded the collector to
                            all non-loopback interfaces (<InlineCode>/proc/net/dev</InlineCode> on Linux,{" "}
                            <InlineCode>Get-NetAdapter</InlineCode> on Windows), capturing interface type
                            (<InlineCode>ethernet | wifi | vpn | unknown</InlineCode>) and operational state
                            (<InlineCode>up | down</InlineCode>).
                        </li>
                        <li>
                            <strong>TimescaleDB Hypertable:</strong> Created{" "}
                            <InlineCode>server_network_stats</InlineCode> with 1-day chunk intervals,
                            1-year data retention, and 5 continuous aggregate views (
                            <InlineCode>minute, hour, day, week, month</InlineCode>).
                        </li>
                        <li>
                            <strong>Delta-Based Throughput Rates:</strong> Historical and live throughput
                            are calculated identically via delta bytes divided by delta time (
                            <InlineCode>(curr - prev) / dt</InlineCode>), ensuring accurate MB/s rates.
                        </li>
                        <li>
                            <strong>Checklist Filtering:</strong> Modeled after the port and process
                            filters using <InlineCode>servers.network_filter</InlineCode> (persisted
                            server selection) and <InlineCode>agents.available_interfaces</InlineCode>{" "}
                            (agent-reported active interfaces).
                        </li>
                        <li>
                            <strong>Dual Chart UI:</strong> Preserved separate Net In and Net Out charts
                            for visual clarity while sharing a unified checklist filter dialog in the Net In
                            header.
                        </li>
                    </ul>
                </SubSection>
            </Section>

            <Section title="ADR-0004: Audit Subsystem (File Activity + Agent Lifecycle)">
                <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        Accepted
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                        docs/architecture/0004-audit-subsystem.md
                    </span>
                </div>

                <SubSection title="Context & Problem">
                    <p>
                        The application required auditable logging for filesystem modifications on
                        monitored servers and monitoring agent lifecycle events (startup, graceful
                        stop, crashes, unexpected disconnects) without constructing redundant,
                        parallel configuration or transport channels.
                    </p>
                </SubSection>

                <SubSection title="Key Decisions">
                    <ul className="list-disc pl-5 space-y-2">
                        <li>
                            <strong>Dedicated Audit Tables:</strong> Created{" "}
                            <InlineCode>file_activity_logs</InlineCode> and{" "}
                            <InlineCode>agent_lifecycle_events</InlineCode>, both scoped by{" "}
                            <InlineCode>server_id</InlineCode> and <InlineCode>agent_id</InlineCode>,
                            surfacing through the existing Logs UI and API.
                        </li>
                        <li>
                            <strong>Reuse Configuration Delivery:</strong> Watched directories are
                            persisted in <InlineCode>watched_paths</InlineCode> and pushed to agents
                            via existing session tokens (<InlineCode>AgentAuthService::issueSession</InlineCode>)
                            and <InlineCode>AgentConfigUpdated</InlineCode> WebSocket broadcasts, avoiding
                            a separate configuration channel.
                        </li>
                        <li>
                            <strong>Durable Agent Queue:</strong> Buffered audit events in an fsynced,
                            local JSON-lines file with per-event UUIDs. The backend guarantees
                            idempotent ingestion, preventing duplicates during queue drains.
                        </li>
                        <li>
                            <strong>Scoped Path Monitoring:</strong>
                            <ul className="list-disc pl-5 mt-1 space-y-1 text-xs md:text-sm">
                                <li>
                                    <em>Agent Scope:</em> Always-on monitoring of the agent state directory
                                    (<InlineCode>%ProgramData%\MonitorAgent</InlineCode>) to audit config
                                    changes and prevent tampering.
                                </li>
                                <li>
                                    <em>Server Scope:</em> Operator-configured directory paths monitored
                                    exclusively for specific servers.
                                </li>
                            </ul>
                        </li>
                        <li>
                            <strong>Backend Heartbeat Timeout Disconnect:</strong> The scheduler detects
                            offline agents when heartbeats expire, recording an{" "}
                            <InlineCode>unexpectedly_disconnected</InlineCode> lifecycle event unless a
                            graceful shutdown event was already recorded within the grace window.
                        </li>
                    </ul>
                </SubSection>
            </Section>

            <Section title="ADR-0005: Agent Delivery Semantics (Bounded Heartbeat Retry, No Metric Backfill)">
                <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        Accepted
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                        docs/architecture/0005-agent-delivery-semantics.md
                    </span>
                </div>

                <SubSection title="Context & Problem">
                    <p>
                        The Go agent previously retried failed heartbeat requests indefinitely.
                        During network or backend interruptions, stale metric payloads queued
                        behind failed attempts, delaying fresher samples and stalling command
                        acknowledgments and configuration updates. The design question was whether
                        to build a durable queue for point-in-time metrics.
                    </p>
                </SubSection>

                <SubSection title="Key Decisions">
                    <ul className="list-disc pl-5 space-y-2">
                        <li>
                            <strong>Tick-Bounded Heartbeat Retry:</strong> Heartbeat delivery is bounded
                            strictly by the tick interval. If transmission fails, the stale payload is
                            discarded; the next tick delivers fresh data. Because the backend stamps
                            metrics at ingest time, retrying stale metrics only corrupts timelines.
                        </li>
                        <li>
                            <strong>No Metric Backfill:</strong> Preserving blank outage gaps on charts
                            is preferred over synthetic backfills. True backfill requires trusting client
                            clocks, creates clock-skew anomalies, and complicates TimescaleDB ingestion
                            windows.
                        </li>
                        <li>
                            <strong>Durable Queue Reserved for Irreplaceable Data:</strong> The durable
                            disk queue (fsynced JSON-lines) is strictly reserved for irreplaceable historical
                            records  -  specifically file activity logs and lifecycle events (ADR-0004).
                        </li>
                        <li>
                            <strong>Idempotent Command Deduplication:</strong> Remote commands dispatched
                            from the backend deduplicate by command ID and acknowledge on the next
                            successful heartbeat, preventing re-execution of shell commands across network
                            reconnects.
                        </li>
                    </ul>
                </SubSection>
            </Section>
        </>
    );
}

export function DocsAgentContent() {
    return (
        <>
            <Section title="The agent">
                <p>
                    The agent is a lightweight Go daemon installed on each
                    monitored server. It collects system metrics, sends
                    heartbeats, maintains a WebSocket control channel, and can
                    self-update its binary.
                </p>
                <p>
                    One agent installation can monitor <strong>multiple</strong>{" "}
                    servers. Its identity is an installation UUID plus an RSA
                    keypair stored in the OS keystore (
                    <InlineCode>MonitorAgentIdentity-&lt;uuid&gt;</InlineCode> on
                    Windows, a 0600 file on Linux) - never in config files, the
                    database, or logs. Per-server monitoring settings (port and
                    process filters) are held in the agent's runtime memory,
                    with the backend as the source of truth.
                </p>
                <ol className="list-decimal pl-5 space-y-1.5">
                    <li>
                        <strong>Register</strong> - the installer passes a
                        one-time provision token; the agent registers its public
                        key.
                    </li>
                    <li>
                        <strong>Authenticate</strong> - short-lived,
                        single-use challenge-response; no persistent token.
                    </li>
                    <li>
                        <strong>Heartbeat</strong> - one aggregated heartbeat
                        per tick covering every owned server (CPU, memory,
                        disk, network sent once; processes/open ports filtered
                        per server inside its partition).
                    </li>
                    <li>
                        <strong>Control</strong> - a WebSocket channel per
                        server receives config and binary updates.
                    </li>
                    <li>
                        <strong>Self-update</strong> - the agent downloads a new
                        binary, swaps it in, and restarts.
                    </li>
                </ol>
            </Section>

            <Section title="Installation & on-disk layout">
                <p>
                    The agent follows the platform convention of separating
                    immutable binaries from mutable machine state:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Binary (read-only)</strong> - Windows{" "}
                        <InlineCode>C:\Program Files\MonitorAgent\&lt;uuid&gt;\MonitorAgent.exe</InlineCode>,
                        Linux <InlineCode>/opt</InlineCode> or{" "}
                        <InlineCode>/usr/local/bin</InlineCode>. The agent never
                        writes here - Program Files is not writable by the
                        service, and this was the root cause of the historical
                        "missing config" reports.
                    </li>
                    <li>
                        <strong>State (service-writable)</strong> - all config
                        and logs live in{" "}
                        <InlineCode>C:\ProgramData\MonitorAgent\instances\&lt;uuid&gt;\</InlineCode>{" "}
                        (Windows) or{" "}
                        <InlineCode>/var/lib/monitor-agent/instances/&lt;uuid&gt;/</InlineCode>{" "}
                        (Linux). ProgramData (or /var/lib) is the correct home
                        for machine-wide, service-writable data; AppData is
                        per-user and wrong for a LocalSystem agent.
                    </li>
                </ul>
                <CodeBlock>{`C:\\Program Files\\MonitorAgent\\<uuid>\\MonitorAgent.exe   # binary (read-only)
C:\\ProgramData\\MonitorAgent\\
  startup.log                                        # early-startup log
  instances\\<uuid>\\
    config.json                                      # bootstrap config
    agent.log                                        # runtime log
    crash.log                                        # last-gasp panic stack
    uninstall.flag                                   # uninstall marker`}</CodeBlock>
                <Callout type="warning">
                    Diagnose the agent in the ProgramData (or /var/lib) instance
                    directory - <strong>not</strong> the Program Files folder
                    where the binary lives. A missing{" "}
                    <InlineCode>config.json</InlineCode> there means the
                    installer never ran; the agent now self-creates a minimal
                    default and logs clearly instead of exiting silently.
                </Callout>
            </Section>

            <Section title="File contents">
                <SubSection title="config.json">
                    <p>
                        Bootstrap config written by the installer, then
                        maintained by the agent:
                    </p>
                    <CodeBlock>{`{
  "server_url": "https://...",
  "agent_version": "2.1",
  "installation_id": "<uuid>",
  "provision_token": "..."   // stripped after registration
}`}</CodeBlock>
                    <ul className="list-disc pl-5 space-y-1.5">
                        <li>
                            The agent fills <InlineCode>installation_id</InlineCode>{" "}
                            if empty and strips{" "}
                            <InlineCode>provision_token</InlineCode> after a
                            successful registration, so the persistent config
                            never holds a secret.
                        </li>
                        <li>
                            If the file is missing entirely, the agent
                            self-bootstraps <InlineCode>{"{ installation_id }"}</InlineCode>{" "}
                            and logs that the installer still needs to supply{" "}
                            <InlineCode>server_url</InlineCode>.
                        </li>
                        <li>
                            Identity keys are never stored here - they live in
                            the OS keystore.
                        </li>
                    </ul>
                </SubSection>
                <SubSection title="agent.log">
                    <p>
                        The agent's runtime log. Stdout, stderr, and the{" "}
                        <InlineCode>log</InlineCode> package output are all
                        redirected here as soon as the instance directory
                        exists.
                    </p>
                </SubSection>
                <SubSection title="startup.log">
                    <p>
                        One-line early-startup log at the data root (before{" "}
                        <InlineCode>agent.log</InlineCode> is wired up). It
                        records "loadConfig failed", "bootstrapDefaultConfig
                        failed", "agent.log open failed", and "runService
                        error" - the first place to look when an agent produces
                        nothing.
                    </p>
                </SubSection>
                <SubSection title="crash.log & uninstall.flag">
                    <p>
                        <InlineCode>crash.log</InlineCode> is a last-gasp panic
                        stack written by the global recovery in{" "}
                        <InlineCode>main()</InlineCode>.{" "}
                        <InlineCode>uninstall.flag</InlineCode> drives the
                        marker-based uninstall: the uninstaller writes{" "}
                        <InlineCode>pending</InlineCode>, the running service
                        revokes the agent and deletes its identity key, then
                        writes <InlineCode>done</InlineCode> so the uninstaller
                        can confirm and tear down the service.
                    </p>
                </SubSection>
            </Section>

            <Section title="Deep dive">
                <p>
                    This page is the overview. The agent is documented in detail
                    across five dedicated references:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <Link
                            to="/docs/agent-architecture"
                            className="text-primary hover:underline"
                        >
                            Agent Architecture
                        </Link>{" "}
                        - startup sequence, CLI, runtime behavior, source files.
                    </li>
                    <li>
                        <Link
                            to="/docs/agent-identity"
                            className="text-primary hover:underline"
                        >
                            Agent Identity
                        </Link>{" "}
                        - the installation UUID and per-platform key storage.
                    </li>
                    <li>
                        <Link
                            to="/docs/agent-storage"
                            className="text-primary hover:underline"
                        >
                            Agent Storage
                        </Link>{" "}
                        - config, logs, keystore, and what survives what.
                    </li>
                    <li>
                        <Link
                            to="/docs/agent-monitoring"
                            className="text-primary hover:underline"
                        >
                            Agent Monitoring
                        </Link>{" "}
                        - heartbeats, filters, and backend port pinging.
                    </li>
                    <li>
                        <Link
                            to="/docs/agent-security"
                            className="text-primary hover:underline"
                        >
                            Agent Security
                        </Link>{" "}
                        - challenge-response auth, channel authorization, and
                        local protection.
                    </li>
                </ul>
                <p>
                    For the operator's view - install commands, statuses, and
                    troubleshooting - see{" "}
                    <Link
                        to="/docs/agent-setup"
                        className="text-primary hover:underline"
                    >
                        Agent Installation &amp; Lifecycle
                    </Link>{" "}
                    in the User Guide.
                </p>
            </Section>
        </>
    );
}

export function DocsCredentialsContent() {
    return (
        <>
            <Section title="Credentials storage">
                <p>
                    Secrets are never committed to the repository. They live in
                    gitignored environment files and are injected into the
                    process at runtime, and sensitive values are stored hashed
                    where applicable: user passwords are bcrypt hashes,
                    refresh-token secrets and password-reset codes/tokens are
                    SHA-256 hashes, and agent private keys never leave the
                    monitored machine at all.
                </p>
            </Section>
            <Section title="Environment layers">
                <p>
                    Loading is immutable - the first source that sets a variable
                    wins. Precedence, highest first:
                </p>
                <ol className="list-decimal pl-5 space-y-1.5">
                    <li>
                        <strong>Real process environment</strong> (Docker, Herd,
                        CI) - always wins, which is why{" "}
                        <InlineCode>.env.docker</InlineCode> works: the image
                        receives secrets as real OS variables that beat every
                        env file (see{" "}
                        <InlineCode>bootstrap/app.php</InlineCode>).
                    </li>
                    <li>
                        <InlineCode>.env</InlineCode> (gitignored) - personal
                        overrides only: Gmail SMTP app credentials, real
                        Cloudinary keys, <InlineCode>MUTE_NOTIFICATION=true</InlineCode>.
                    </li>
                    <li>
                        <InlineCode>.env.development</InlineCode> (tracked) -
                        shared dev defaults. Committed secrets here are dummies
                        (<InlineCode>JWT_SECRET=dev-only-…</InlineCode>);{" "}
                        <InlineCode>.env.example</InlineCode> is regenerated from
                        it on every <InlineCode>node entry.js</InlineCode> run.
                    </li>
                </ol>
                <Callout>
                    <InlineCode>VITE_*</InlineCode> variables are mirrored into
                    the browser bundle by <InlineCode>scripts/entry.js</InlineCode> -
                    they are public by design. Never put a secret behind a{" "}
                    <InlineCode>VITE_</InlineCode> prefix.
                </Callout>
            </Section>
            <Section title="User passwords">
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        Stored as <strong>bcrypt hashes</strong> only, via the{" "}
                        <InlineCode>hashed</InlineCode> cast on{" "}
                        <InlineCode>App\Models\User</InlineCode> (
                        <InlineCode>BCRYPT_ROUNDS=12</InlineCode> in dev).
                        Plaintext passwords never touch the database and are
                        never logged.
                    </li>
                    <li>
                        Changing a password (profile update) revokes all other
                        sessions; resetting a password revokes{" "}
                        <strong>all</strong> sessions, so a compromised session
                        does not survive recovery.
                    </li>
                </ul>
            </Section>
            <Section title="Sessions and tokens">
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>Access token</strong> - HS256 JWT signed with{" "}
                        <InlineCode>JWT_SECRET</InlineCode> (15 min TTL), with{" "}
                        <InlineCode>sub</InlineCode> (user id) and{" "}
                        <InlineCode>sid</InlineCode> (session UUID) claims. The{" "}
                        <InlineCode>JwtGuard</InlineCode> re-checks{" "}
                        <InlineCode>user_sessions</InlineCode> on every request,
                        so a revoked or compromised session is rejected
                        immediately, not at token expiry.
                    </li>
                    <li>
                        <strong>Refresh token</strong> - a ULID id plus a 256-bit
                        random secret (<InlineCode>id.secret</InlineCode>). Only
                        the <strong>SHA-256 hash</strong> of the secret is stored
                        (<InlineCode>refresh_token_hash</InlineCode>); the raw
                        value travels only in an <strong>HttpOnly, SameSite=lax
                        cookie</strong> scoped to <InlineCode>/api</InlineCode>.
                    </li>
                    <li>
                        <strong>Rotation</strong> - each refresh rotates the
                        pair and keeps the previous hash for a{" "}
                        <strong>30-second grace window</strong> (multi-tab
                        safety). Presenting an older token after that is treated
                        as reuse: the session is marked compromised and revoked.
                    </li>
                    <li>
                        <strong>Logout / logout-all</strong> revoke the current
                        session / every other session via{" "}
                        <InlineCode>SessionManager</InlineCode>.
                    </li>
                </ul>
            </Section>
            <Section title="Password reset">
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>6-digit code</strong>, stored as a SHA-256 hash,
                        valid 10 minutes, with a 60-second resend cooldown and
                        throttled endpoints. Responses never reveal whether an
                        account exists (masked email only) and every attempt is
                        audit-logged.
                    </li>
                    <li>
                        Verifying the code mints a <strong>64-character reset
                        token</strong> (also SHA-256 hashed at rest, 15-minute
                        TTL) for the actual password change.
                    </li>
                    <li>
                        A successful reset revokes all sessions and deletes the
                        reset row, so the token cannot be replayed.
                    </li>
                </ul>
            </Section>
            <Section title="Agent identity and auth">
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        Each installation generates its own <strong>RSA keypair
                        </strong> at install time. The private key never leaves
                        the machine: Windows keeps it as a persisted CNG key (
                        <InlineCode>NCrypt</InlineCode>, named{" "}
                        <InlineCode>MonitorAgentIdentity-&lt;installation-uuid&gt;</InlineCode>
                        , non-exportable); Linux keeps it as a{" "}
                        <InlineCode>0600</InlineCode> file owned by the service
                        account, outside the instance config directory.
                        Uninstall deletes the OS key.
                    </li>
                    <li>
                        The backend stores only the <strong>public half</strong>:
                        the SPKI DER (base64) plus its <strong>SHA-256
                        fingerprint</strong> (<InlineCode>agents.public_key</InlineCode> /{" "}
                        <InlineCode>public_key_hash</InlineCode>, plus{" "}
                        <InlineCode>agent_identities</InlineCode>). The
                        fingerprint is an identifier, not a secret - possession
                        of the private key is what authenticates.
                    </li>
                    <li>
                        <strong>Challenge-response</strong>: the agent asks for a
                        challenge by fingerprint, receives a random single-use
                        challenge (60 s TTL,{" "}
                        <InlineCode>AGENT_CHALLENGE_TTL</InlineCode>), and signs
                        it with RSA-SHA256 (PKCS#1 v1.5). The backend verifies
                        the signature against the registered public key.
                    </li>
                    <li>
                        On success the backend issues a short-lived{" "}
                        <strong>agent JWT</strong> (HS256, same{" "}
                        <InlineCode>JWT_SECRET</InlineCode>,{" "}
                        <InlineCode>kind=agent</InlineCode>, 15 min TTL via{" "}
                        <InlineCode>AGENT_SESSION_TTL=900</InlineCode>) that the
                        agent keeps <strong>in process memory only</strong> for
                        heartbeats, updates, and the Reverb private-channel
                        subscription. There is no persistent agent token.
                    </li>
                </ul>
            </Section>
            <Section title="Provision tokens">
                <p>
                    Dashboard-generated install tokens are 64 random characters,
                    single-use, with a 30-minute TTL. Regenerating revokes any
                    previous active token for the server; expired tokens are
                    swept hourly (<InlineCode>tokens:cleanup</InlineCode>) and
                    on every <InlineCode>system:monitor</InlineCode> tick, and
                    registration marks them used inside a transaction so they
                    cannot be replayed.
                </p>
            </Section>
            <Section title="What is hashed, what is short-lived">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-border/40 rounded-lg overflow-hidden">
                        <thead className="bg-muted/30">
                            <tr>
                                <th className="text-left px-3 py-2 font-medium text-foreground">
                                    Credential
                                </th>
                                <th className="text-left px-3 py-2 font-medium text-foreground">
                                    At rest
                                </th>
                                <th className="text-left px-3 py-2 font-medium text-foreground">
                                    Lifetime
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    User password
                                </td>
                                <td className="px-3 py-1.5">bcrypt hash</td>
                                <td className="px-3 py-1.5">until changed</td>
                            </tr>
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    Refresh secret
                                </td>
                                <td className="px-3 py-1.5">SHA-256 hash</td>
                                <td className="px-3 py-1.5">rotated per refresh (30 d session)</td>
                            </tr>
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    Reset code / token
                                </td>
                                <td className="px-3 py-1.5">SHA-256 hash</td>
                                <td className="px-3 py-1.5">10 min / 15 min, single use</td>
                            </tr>
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    Agent private key
                                </td>
                                <td className="px-3 py-1.5">OS keystore only, never in DB</td>
                                <td className="px-3 py-1.5">until uninstall</td>
                            </tr>
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    Agent challenge
                                </td>
                                <td className="px-3 py-1.5">pending row, consumed on verify</td>
                                <td className="px-3 py-1.5">60 s, single use</td>
                            </tr>
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    Agent session JWT
                                </td>
                                <td className="px-3 py-1.5">memory only, never persisted</td>
                                <td className="px-3 py-1.5">15 min</td>
                            </tr>
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    Provision token
                                </td>
                                <td className="px-3 py-1.5">DB row with status + expiry</td>
                                <td className="px-3 py-1.5">30 min, single use</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </Section>
            <Section title="Rotation">
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        Rotating <InlineCode>JWT_SECRET</InlineCode> or{" "}
                        <InlineCode>APP_KEY</InlineCode> invalidates all user
                        and agent sessions - plan a maintenance window.
                    </li>
                    <li>
                        Infrastructure secrets (<InlineCode>DB_PASSWORD</InlineCode>,{" "}
                        <InlineCode>REDIS_PASSWORD</InlineCode>,{" "}
                        <InlineCode>REVERB_APP_*</InlineCode>,{" "}
                        <InlineCode>MAIL_USERNAME / MAIL_PASSWORD</InlineCode>{" "}
                        Gmail app password,{" "}
                        <InlineCode>CLOUDINARY_*</InlineCode>) rotate in the env
                        file / container environment, then restart or redeploy.
                    </li>
                    <li>
                        A compromised user account is recovered with password
                        reset (global logout); a compromised host is recovered by
                        uninstalling the agent (deletes the OS key) and
                        deregistering it, then provisioning fresh.
                    </li>
                </ul>
            </Section>

            <Section title="Production secrets (.env.docker)">
                <p>
                    The production stack runs off <InlineCode>.env.docker</InlineCode>
                    (gitignored, supplied via <InlineCode>npm run setup:docker</InlineCode>). The
                    image receives them as real OS variables, which beat every env file under
                    Laravel's immutable loader - so this is the single source of prod secrets:
                </p>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-border/40 rounded-lg overflow-hidden">
                        <thead className="bg-muted/30">
                            <tr>
                                <th className="text-left px-3 py-2 font-medium text-foreground">
                                    Key
                                </th>
                                <th className="text-left px-3 py-2 font-medium text-foreground">
                                    Where to get it
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    APP_KEY
                                </td>
                                <td className="px-3 py-1.5">
                                    <InlineCode>php artisan key:generate --show</InlineCode>
                                </td>
                            </tr>
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    APP_DOMAIN
                                </td>
                                <td className="px-3 py-1.5">
                                    your public domain (required - Caddy auto-HTTPS and
                                    compose.prod fail without it)
                                </td>
                            </tr>
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    JWT_SECRET
                                </td>
                                <td className="px-3 py-1.5">any 64-hex string</td>
                            </tr>
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    DB_PASSWORD / REDIS_PASSWORD
                                </td>
                                <td className="px-3 py-1.5">invent strong ones</td>
                            </tr>
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    REVERB_APP_ID / KEY / SECRET
                                </td>
                                <td className="px-3 py-1.5">
                                    <InlineCode>php artisan reverb:install</InlineCode> or reuse
                                    dev values
                                </td>
                            </tr>
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    MAIL_USERNAME / PASSWORD
                                </td>
                                <td className="px-3 py-1.5">Gmail app password</td>
                            </tr>
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET
                                </td>
                                <td className="px-3 py-1.5">cloudinary.com dashboard</td>
                            </tr>
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    DEFAULT_*_PICTURE / BANNER
                                </td>
                                <td className="px-3 py-1.5">any image URLs (defaults in <InlineCode>.env.development</InlineCode>)</td>
                            </tr>
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    SEEDED_DISCORD_BOT_TOKEN / CHANNEL_ID / ROLE_ID
                                </td>
                                <td className="px-3 py-1.5">Discord developer portal (seeded dev values in <InlineCode>.env.development</InlineCode>)</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <Callout type="warning">
                    Never commit <InlineCode>.env</InlineCode>,{" "}
                    <InlineCode>.env.production</InlineCode>, or{" "}
                    <InlineCode>.env.docker</InlineCode> - all are gitignored. A real
                    Cloudinary secret once lived in{" "}
                    <InlineCode>.env.development</InlineCode> (since removed); it still
                    exists in git history - rotate it at console.cloudinary.com if that
                    account is still in use.
                </Callout>
            </Section>
        </>
    );
}

export function DocsSchedulingContent() {
    return (
        <>
            <Section title="Scheduled commands">
                <p>
                    The Laravel scheduler drives monitoring, aggregation, and
                    maintenance. Run it with{" "}
                    <InlineCode>php artisan schedule:work</InlineCode> in dev
                    or a cron entry in production.
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>system:monitor</strong> (every minute) - the
                        single entry point. Dispatches a MonitorServer job per
                        server with an agent, expires stale provision tokens,
                        syncs "no SecOps assigned" action items, and emits a
                        system telemetry event.
                    </li>
                    <li>
                        <strong>agg:refresh</strong> (every minute) - refreshes
                        the Timescale continuous aggregates used by charts and
                        reports.
                    </li>
                    <li>
                        <strong>node-tasks:process</strong> (every 5 seconds) -
                        fires due alert-engine timer tasks (sustained / check
                        after / repeat).
                    </li>
                    <li>
                        <strong>tokens:cleanup</strong> (hourly) - expires
                        provision tokens past their validity.
                    </li>
                    <li>
                        <strong>uploads:cleanup</strong> (hourly) - removes
                        expired upload intents and their storage assets.
                    </li>
                    <li>
                        <strong>uploads:consistency-check</strong> (daily) -
                        validates upload intents and entity references against
                        the storage provider.
                    </li>
                    <li>
                        <strong>agent-data:cleanup</strong> (daily) - removes
                        high-volume, low-retention rows older than the
                        configured Data Retention window (default 60 days):
                        agent heartbeats, metric batches/samples, and file
                        activity events. Agent logs and long-term records
                        (CRUD, install/uninstall) are kept. Retention is set in
                        Settings → Agent Settings → Data Retention.
                    </li>
                </ul>
            </Section>

            <Section title="Queued jobs">
                <p>
                    <InlineCode>QUEUE_CONNECTION=database</InlineCode> - a queue
                    worker processes jobs asynchronously. Key jobs:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>MonitorServer</strong> - resolves the alert
                        config for one server and evaluates it (dispatched by
                        <InlineCode> system:monitor</InlineCode>).
                    </li>
                    <li>
                        <strong>FireNodeTimer</strong> - fires a due alert timer
                        against historical metric data.
                    </li>
                    <li>
                        <strong>SendNotification</strong> - delivers alert
                        notifications (email, SMS, Discord).
                    </li>
                    <li>
                        <strong>CleanupExpiredUploadIntents</strong> - removes
                        expired uploads.
                    </li>
                </ul>
            </Section>

            <Section title="WebSocket channels">
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <InlineCode>dashboard</InlineCode> (private) - server
                        status updates, action item updates, and usage
                        broadcasts.
                    </li>
                    <li>
                        <InlineCode>{"server.{uuid}"}</InlineCode> (private) -
                        live stat points, status updates, provision token
                        generation, registration completion, agent
                        uninstalled.
                    </li>
                    <li>
                        <InlineCode>{"agent.{serverUuid}"}</InlineCode> (private) -
                        agent control channel (config updates, binary
                        updates).
                    </li>
                    <li>
                        <InlineCode>system-telemetry</InlineCode> (private) -
                        aggregate system telemetry broadcasts.
                    </li>
                </ul>
            </Section>

            <Section title="Utility commands">
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <InlineCode>server:update-metrics</InlineCode> - dev
                        tool that injects simulated metrics (single-shot or{" "}
                        <InlineCode>--daemon</InlineCode>).
                    </li>
                    <li>
                        <InlineCode>agent:version-sync</InlineCode> - syncs the
                        agent version records with the built binaries.
                    </li>
                    <li>
                        <InlineCode>node-config:verify</InlineCode> - manual
                        validation of a node config.
                    </li>
                </ul>
            </Section>

            <Section title="Development server stack">
                <p>
                    <InlineCode>npm run dev</InlineCode> runs{" "}
                    <InlineCode>node entry.js dev</InlineCode>, which loads{" "}
                    <InlineCode>.env.development</InlineCode> + personal{" "}
                    <InlineCode>.env</InlineCode> overrides, clears the config
                    cache, spawns the artisan workers directly (Reverb
                    broadcaster, queue worker, task scheduler), and runs the
                    rest via <InlineCode>concurrently</InlineCode>:
                </p>
                <CodeBlock>{`redis-server                    # Redis cache
npm run dev -w frontend            # Vite dev server (HMR)
npm run dev -w docs                # Docs site
php artisan reverb:start            # WebSocket broadcaster (spawned by entry.js)
php artisan queue:work -q           # Queue worker (spawned by entry.js)
php artisan schedule:work           # Task scheduler (spawned by entry.js)`}</CodeBlock>
                <p>
                    Secrets (e.g. Gmail SMTP credentials) live in{" "}
                    <InlineCode>.env</InlineCode> (gitignored), which Laravel loads
                    directly and which overrides the tracked{" "}
                    <InlineCode>.env.development</InlineCode>. The Vite dev server
                    proxies <InlineCode>/api</InlineCode> and{" "}
                    <InlineCode>/sanctum</InlineCode> to the backend at{" "}
                    <InlineCode>APP_URL</InlineCode>. The SPA connects to Reverb
                    using <InlineCode>VITE_REVERB_*</InlineCode> values injected
                    from the root env by the entry script (there is no{" "}
                    <InlineCode>frontend/.env</InlineCode> - only{" "}
                    <InlineCode>frontend/.env.example</InlineCode>).
                </p>
                <Callout>
                    Set <InlineCode>MUTE_NOTIFICATION=true</InlineCode> in{" "}
                    <InlineCode>.env.development</InlineCode> to suppress
                    notifications during development.
                </Callout>
                <p>
                    For production builds without dev servers,{" "}
                    <InlineCode>npm run prod</InlineCode> runs{" "}
                    <InlineCode>node entry.js prod</InlineCode> (loads{" "}
                    <InlineCode>.env.production</InlineCode>, clears config cache,
                    builds). <InlineCode>npm start</InlineCode> additionally
                    deploys the built SPA into <InlineCode>public/</InlineCode>{" "}
                    via <InlineCode>scripts/deploy-spa.js</InlineCode>, but does
                    not start a web server - that must be handled by
                    nginx/Apache.
                </p>
            </Section>

            <Section title="Telescope - dev-only">
                <Callout type="warning">
                    <strong>Only run Telescope in development</strong> or behind an
                    admin gate. It records requests, jobs, queries, and logs - never
                    expose <InlineCode>/telescope</InlineCode> in production.
                </Callout>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <InlineCode>TELESCOPE_ENABLED=true</InlineCode> in{" "}
                        <InlineCode>.env.development</InlineCode> (dev) and{" "}
                        <InlineCode>false</InlineCode> in{" "}
                        <InlineCode>.env.production</InlineCode> (prod).{" "}
                        <InlineCode>npm start</InlineCode> /{" "}
                        <InlineCode>node entry.js prod</InlineCode> will print a
                        warning and block Telescope if it is left enabled.
                    </li>
                    <li>
                        Access is gated by{" "}
                        <InlineCode>Gate::define('viewTelescope')</InlineCode> in{" "}
                        <InlineCode>App\Providers\TelescopeServiceProvider</InlineCode>{" "}
                        - in production it returns <InlineCode>false</InlineCode>{" "}
                        unless you add admin emails via{" "}
                        <InlineCode>TELESCOPE_ADMIN_EMAILS</InlineCode>.
                    </li>
                    <li>
                        Dev: open <InlineCode>APP_URL/telescope</InlineCode> after{" "}
                        <InlineCode>npm run dev</InlineCode>. Prod: request returns{" "}
                        <InlineCode>403</InlineCode>.
                    </li>
                </ul>
            </Section>

            <Section title="Alert visual debugger - dev-only">
                <p>
                    The System Pipeline &amp; Telemetry Visualizer is an opt-in
                    debugging tool. It is <strong>off by default</strong> so the
                    backend emits no telemetry in normal operation.
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <InlineCode>ALERTS_VISUAL_DEBUGGER=true</InlineCode> in{" "}
                        <InlineCode>.env.development</InlineCode> enables the
                        backend: the{" "}
                        <InlineCode>/node-configs/telemetry-state</InlineCode>{" "}
                        endpoint returns a snapshot and all realtime telemetry
                        broadcasts fire. When unset (or <InlineCode>false</InlineCode>
                        ), the endpoint returns <InlineCode>404</InlineCode> and
                        nothing is broadcast.
                    </li>
                    <li>
                        <InlineCode>VITE_ALERTS_VISUAL_DEBUGGER=true</InlineCode> in{" "}
                        <InlineCode>frontend/.env</InlineCode> reveals the{" "}
                        <InlineCode>/settings/alerts/debugger</InlineCode> route.
                        Without it the route redirects to{" "}
                        <InlineCode>/settings</InlineCode>.
                    </li>
                </ul>
            </Section>

            <Section title="Testing">
                <p>
                    The test command is <InlineCode>npm test</InlineCode> (runs the full
                    Pest suite). To run a single test or filter:
                </p>
                <CodeBlock>{`npm test                        # full Pest suite
npm run test:filter -- Name        # single filter
npm run test:auth                  # convenience alias
npm run test:middleware            # convenience alias`}</CodeBlock>
                <p>
                    Format PHP before committing with{" "}
                    <InlineCode>vendor/bin/pint --dirty --format agent</InlineCode>. The OpenAPI
                    schema is regenerated on demand:
                </p>
                <CodeBlock>{`npm run types   # scramble:clear -> export -> patch-schema -> tsc`}</CodeBlock>
                <Callout>
                    CI (<InlineCode>.github/workflows/ci.yml</InlineCode>) runs Pest +
                    Pint + the frontend build on pushes to{" "}
                    <InlineCode>main</InlineCode> (and pull requests). Go agent
                    tests run
                    locally from{" "}
                    <InlineCode>resources/agent/go</InlineCode>
                    {" "}(<InlineCode>go test ./...</InlineCode>); on Windows two cases
                    are pre-existing flakiness under suite load{" "}
                    (<InlineCode>TestWatcherSkipsDirectoryModified</InlineCode> and an
                    intermittent <InlineCode>ReadDirectoryChangesW</InlineCode> handle
                    race) - they pass in isolation and on Linux.
                </Callout>
            </Section>
        </>
    );
}
