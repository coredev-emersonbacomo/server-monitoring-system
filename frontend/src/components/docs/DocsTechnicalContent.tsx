import {
    Section,
    InlineCode,
    Callout,
    CodeBlock,
} from "./Section";

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
                        heartbeats (CPU, memory, disk, network, top processes,
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
            </Section>
            <Section title="Under construction">
                <Callout type="warning">
                    The agent flow is being updated and is not ready yet. This
                    is currently a placeholder.
                </Callout>
                <p>
                    Until the agent settles, rely on:
                </p>
                <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                        The <strong>Agent Installation Guide</strong> in the
                        User Guide (Servers) for installing the agent on a
                        machine.
                    </li>
                    <li>
                        The <strong>Agent tab</strong> on a server's detail
                        page for the installed properties.
                    </li>
                    <li>
                        <strong>Agent Settings</strong> for heartbeat, offline
                        threshold, and version controls.
                    </li>
                </ul>
                <p>
                    The agent source lives in{" "}
                    <InlineCode>resources/agent/go</InlineCode>, and the build
                    pipeline is <InlineCode>npm run compileagent</InlineCode>.
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