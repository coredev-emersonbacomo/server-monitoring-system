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
                        <strong>Laravel backend</strong> — REST API (JWT auth),
                        Reverb WebSockets, the node-based alert engine, queued
                        jobs, the scheduler, and Typst report compilation.
                    </li>
                    <li>
                        <strong>React SPA</strong> — the dashboard and
                        management UI, talking to the API through an
                        OpenAPI-generated typed client.
                    </li>
                    <li>
                        <strong>Go agent</strong> — installed on monitored
                        servers; collects metrics, heartbeats, executes
                        commands, and self-updates.
                    </li>
                    <li>
                        <strong>PostgreSQL + TimescaleDB</strong> — relational
                        data plus time-series aggregates for charts and
                        reports.
                    </li>
                    <li>
                        <strong>Redis</strong> — cache and broadcast support.
                    </li>
                    <li>
                        <strong>Reverb</strong> — Pusher-compatible WebSocket
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
        </>
    );
}

export function DocsAdrContent() {
    return (
        <>
            <Section title="Architecture Decision Records">
                <p>
                    This section will hold a decision log of the significant
                    architecture choices behind the system — why the stack was
                    chosen, how the alert engine works, how realtime updates
                    are delivered, and how reporting is compiled.
                </p>
            </Section>
            <Section title="Under construction">
                <Callout type="warning">
                    The ADR record is being updated and is not ready yet. This
                    is currently a placeholder.
                </Callout>
                <p>
                    While this section is drafted, the concrete reference
                    material below (Architecture, Alerting System, Storage
                    Providers, Background Jobs & Scheduling) already documents
                    how the pieces actually work today.
                </p>
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
                    Windows, a 0600 file on Linux) — never in config files, the
                    database, or logs. Per-server monitoring settings (port and
                    process filters) are held in the agent's runtime memory,
                    with the backend as the source of truth.
                </p>
                <ol className="list-decimal pl-5 space-y-1.5">
                    <li>
                        <strong>Register</strong> — the installer passes a
                        one-time provision token; the agent registers its public
                        key.
                    </li>
                    <li>
                        <strong>Authenticate</strong> — short-lived,
                        single-use challenge-response; no persistent token.
                    </li>
                    <li>
                        <strong>Heartbeat</strong> — one heartbeat per owned
                        server (CPU, memory, disk, network, processes, open
                        ports), filtered by each server's filter.
                    </li>
                    <li>
                        <strong>Control</strong> — a WebSocket channel per
                        server receives config and binary updates.
                    </li>
                    <li>
                        <strong>Self-update</strong> — the agent downloads a new
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
                        <strong>Binary (read-only)</strong> — Windows{" "}
                        <InlineCode>C:\Program Files\MonitorAgent\&lt;uuid&gt;\MonitorAgent.exe</InlineCode>,
                        Linux <InlineCode>/opt</InlineCode> or{" "}
                        <InlineCode>/usr/local/bin</InlineCode>. The agent never
                        writes here — Program Files is not writable by the
                        service, and this was the root cause of the historical
                        "missing config" reports.
                    </li>
                    <li>
                        <strong>State (service-writable)</strong> — all config
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
                    directory — <strong>not</strong> the Program Files folder
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
                            Identity keys are never stored here — they live in
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
                        error" — the first place to look when an agent produces
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
                        — startup sequence, CLI, runtime behavior, source files.
                    </li>
                    <li>
                        <Link
                            to="/docs/agent-identity"
                            className="text-primary hover:underline"
                        >
                            Agent Identity
                        </Link>{" "}
                        — the installation UUID and per-platform key storage.
                    </li>
                    <li>
                        <Link
                            to="/docs/agent-storage"
                            className="text-primary hover:underline"
                        >
                            Agent Storage
                        </Link>{" "}
                        — config, logs, keystore, and what survives what.
                    </li>
                    <li>
                        <Link
                            to="/docs/agent-monitoring"
                            className="text-primary hover:underline"
                        >
                            Agent Monitoring
                        </Link>{" "}
                        — heartbeats, filters, and backend port pinging.
                    </li>
                    <li>
                        <Link
                            to="/docs/agent-security"
                            className="text-primary hover:underline"
                        >
                            Agent Security
                        </Link>{" "}
                        — challenge-response auth, channel authorization, and
                        local protection.
                    </li>
                </ul>
                <p>
                    For the operator's view — install commands, statuses, and
                    troubleshooting — see{" "}
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
                    where applicable.
                </p>
            </Section>
            <Section title="Under construction">
                <Callout type="warning">
                    The credentials-storing design is being updated and is not
                    ready yet. This is currently a placeholder.
                </Callout>
                <p>
                    Today, the high-level picture is:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <InlineCode>.env.credentials</InlineCode> (gitignored)
                        — Gmail SMTP app credentials injected into{" "}
                        <InlineCode>process.env</InlineCode> at runtime by{" "}
                        <InlineCode>scripts/dev.js</InlineCode>.
                    </li>
                    <li>
                        <InlineCode>.env.production</InlineCode> (gitignored) —
                        production secrets such as the JWT secret and Neon
                        database URL.
                    </li>
                    <li>
                        Agent auth is <strong>challenge-response</strong>: the
                        agent keeps a private key in the OS keystore on the
                        machine, registers its public key with the backend, and
                        authenticates with short-lived, single-use challenges —
                        there is no persistent token.
                    </li>
                </ul>
                <p>
                    The detailed credential lifecycle, rotation, and provider
                    handling will be documented here once the design settles.
                </p>
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
                        <strong>system:monitor</strong> (every minute) — the
                        single entry point. Dispatches a MonitorServer job per
                        server with an agent, expires stale provision tokens,
                        syncs "no SecOps assigned" action items, and emits a
                        system telemetry event.
                    </li>
                    <li>
                        <strong>agg:refresh</strong> (every minute) — refreshes
                        the Timescale continuous aggregates used by charts and
                        reports.
                    </li>
                    <li>
                        <strong>node-tasks:process</strong> (every 5 seconds) —
                        fires due alert-engine timer tasks (sustained / check
                        after / repeat).
                    </li>
                    <li>
                        <strong>tokens:cleanup</strong> (hourly) — expires
                        provision tokens past their validity.
                    </li>
                    <li>
                        <strong>uploads:cleanup</strong> (hourly) — removes
                        expired upload intents and their storage assets.
                    </li>
                    <li>
                        <strong>uploads:consistency-check</strong> (daily) —
                        validates upload intents and entity references against
                        the storage provider.
                    </li>
                </ul>
            </Section>

            <Section title="Queued jobs">
                <p>
                    <InlineCode>QUEUE_CONNECTION=database</InlineCode> — a queue
                    worker processes jobs asynchronously. Key jobs:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <strong>MonitorServer</strong> — resolves the alert
                        config for one server and evaluates it (dispatched by
                        <InlineCode> system:monitor</InlineCode>).
                    </li>
                    <li>
                        <strong>FireNodeTimer</strong> — fires a due alert timer
                        against historical metric data.
                    </li>
                    <li>
                        <strong>SendNotification</strong> — delivers alert
                        notifications (email, SMS, Discord).
                    </li>
                    <li>
                        <strong>CleanupExpiredUploadIntents</strong> — removes
                        expired uploads.
                    </li>
                </ul>
            </Section>

            <Section title="WebSocket channels">
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <InlineCode>dashboard</InlineCode> (private) — server
                        status updates, action item updates, and usage
                        broadcasts.
                    </li>
                    <li>
                        <InlineCode>{"server.{uuid}"}</InlineCode> (private) —
                        live stat points, status updates, provision token
                        generation, registration completion, agent
                        uninstalled.
                    </li>
                    <li>
                        <InlineCode>{"agent.{serverUuid}"}</InlineCode> (private) —
                        agent control channel (config updates, binary
                        updates).
                    </li>
                </ul>
            </Section>

            <Section title="Utility commands">
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        <InlineCode>server:update-metrics</InlineCode> — dev
                        tool that injects simulated metrics (single-shot or{" "}
                        <InlineCode>--daemon</InlineCode>).
                    </li>
                    <li>
                        <InlineCode>agent:version-sync</InlineCode> — syncs the
                        agent version records with the built binaries.
                    </li>
                    <li>
                        <InlineCode>VerifyNodeConfig</InlineCode> — manual
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
                    cache, then spawns <InlineCode>scripts/dev.js</InlineCode>{" "}
                    via <InlineCode>concurrently</InlineCode>:
                </p>
                <CodeBlock>{`redis-server                    # Redis cache
npm run dev -w frontend            # Vite dev server (HMR)
php artisan reverb:start            # WebSocket broadcaster
php artisan queue:work -q           # Queue worker
php artisan schedule:work           # Task scheduler`}</CodeBlock>
                <p>
                    <InlineCode>scripts/dev.js</InlineCode> also loads{" "}
                    <InlineCode>.env.credentials</InlineCode> (gitignored) so
                    Gmail SMTP overrides work during development. The Vite dev
                    server proxies <InlineCode>/api</InlineCode> and{" "}
                    <InlineCode>/sanctum</InlineCode> to the backend at{" "}
                    <InlineCode>APP_URL</InlineCode>. The SPA connects to Reverb
                    using <InlineCode>VITE_REVERB_*</InlineCode> values from{" "}
                    <InlineCode>frontend/.env</InlineCode>.
                </p>
                <Callout>
                    Optional arg:{" "}
                    <InlineCode>npm run dev muteNotification</InlineCode> sets{" "}
                    <InlineCode>MUTE_NOTIFICATION=1</InlineCode> to suppress
                    notifications during development.
                </Callout>
                <p>
                    For production builds without dev servers,{" "}
                    <InlineCode>npm run prod</InlineCode> runs{" "}
                    <InlineCode>node entry.js prod</InlineCode> (loads{" "}
                    <InlineCode>.env.production</InlineCode>, clears config cache,
                    builds). <InlineCode>npm start</InlineCode> additionally
                    deploys the built SPA into <InlineCode>public/</InlineCode>{" "}
                    via <InlineCode>scripts/start.js</InlineCode>, but does not
                    start a web server — that must be handled by nginx/Apache.
                </p>
            </Section>
        </>
    );
}