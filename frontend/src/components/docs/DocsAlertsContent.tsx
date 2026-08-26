import { NodeConfigEditor } from "@/components/node-config/NodeConfigEditor";
import type { NodeConfigGraph } from "@/types/node-config";
import {
    Section,
    SubSection,
    CodeBlock,
    InlineCode,
    Callout,
} from "@/components/docs/Section";

// ── Static graph data (mirrors NodeConfigSeeder — 2026-08-25 single-agent + per-interface network) ──

const alertGraph: NodeConfigGraph = {
    nodes: [
        {
            id: "metric_cpu",
            type: "metric",
            position: { x: 100, y: 60 },
            settings: { label: "CPU Usage", metric_type: "cpu_usage" },
        },
        {
            id: "metric_memory",
            type: "metric",
            position: { x: -120, y: 60 },
            settings: { label: "Memory Usage", metric_type: "memory_usage" },
        },
        {
            id: "metric_disk",
            type: "metric",
            position: { x: -120, y: 210 },
            settings: { label: "Disk Usage", metric_type: "disk_usage" },
        },
        {
            id: "metric_network",
            type: "metric",
            position: { x: 100, y: 210 },
            settings: { label: "Network Usage", metric_type: "network_usage" },
        },
        {
            id: "compare_85",
            type: "condition",
            position: { x: 340, y: 140 },
            settings: {
                label: ">= 85%",
                operator: "greater_than_equal",
                threshold: 85,
                min: 0,
                max: 0,
            },
        },
        {
            id: "sustained_10",
            type: "sustained",
            position: { x: 600, y: -180 },
            settings: { label: "Sustained 10s", duration: "10000" },
        },
        {
            id: "sustained_20",
            type: "sustained",
            position: { x: 600, y: 140 },
            settings: { label: "Sustained 20s", duration: "20000" },
        },
        {
            id: "sustained_30",
            type: "sustained",
            position: { x: 600, y: 460 },
            settings: {
                label: "Sustained 30s + Repeat",
                duration: "30000",
                repeat_interval: "10000",
                repeat_max_repeats: -1,
            },
        },
        {
            id: "email_10",
            type: "notification",
            position: { x: 860, y: -180 },
            settings: {
                label: "Email 10s",
                channel: "email",
                severity: "notice",
                subject:
                    "[{server.client.name}] {server.name} - {runtime.metricName} Alert (10s)",
                message:
                    "[{server.client.name}] {server.name}'s {runtime.metricName} has been above 85% for {runtime.sustainValue}!\nAlert Trigger: <t:{runtime.eventTimestampUnix}:f>",
            },
        },
        {
            id: "email_20",
            type: "notification",
            position: { x: 860, y: 140 },
            settings: {
                label: "Email 20s",
                channel: "email",
                severity: "warning",
                subject:
                    "[{server.client.name}] {server.name} - {runtime.metricName} Alert (20s)",
                message:
                    "[{server.client.name}] {server.name}'s {runtime.metricName} has been above 85% for {runtime.sustainValue}!\nAlert Trigger: <t:{runtime.eventTimestampUnix}:f>",
            },
        },
        {
            id: "discord_30",
            type: "notification",
            position: { x: 860, y: 460 },
            settings: {
                label: "Discord 30s",
                channel: "discord",
                severity: "critical",
                message:
                    ":rotating_light: [{server.client.name}] {server.name}'s {runtime.metricName} has been above 85% for {runtime.sustainValue}!\n\nEvent: <t:{runtime.eventTimestampUnix}:f>\n<if-repeat>\nFirst Trigger: <t:{runtime.firstTriggerTimestampUnix}:f>\n</if-repeat>\n<if-repeat>\n<discord-footer>Server Monitoring System · repeat: {runtime.repeat.countOfMessage} of {runtime.repeat.max} ({runtime.repeat.interval})</discord-footer>\n</if-repeat>\n" +
                    '<discord-button url="{server.url}">View Server Details</discord-button>',
            },
        },
        {
            id: "metric_status",
            type: "metric",
            position: { x: -300, y: 580 },
            settings: { label: "Server Status", metric_type: "server_status" },
        },
        {
            id: "email_offline",
            type: "notification",
            position: { x: -60, y: 430 },
            settings: {
                label: "Email Offline",
                channel: "email",
                severity: "warning",
                subject: "[{server.client.name}] {server.name} - Offline Alert",
                message:
                    "[{server.client.name}] {server.name} has been offline for {runtime.offlineDuration}!\nAlert Trigger: <t:{runtime.eventTimestampUnix}:f>",
            },
        },
        {
            id: "check_after_10m",
            type: "check_after",
            position: { x: -60, y: 750 },
            settings: {
                label: "Check After 10s",
                duration: "10000",
                repeat_interval: "10000",
                repeat_max_repeats: -1,
            },
        },
        {
            id: "discord_offline",
            type: "notification",
            position: { x: 200, y: 670 },
            settings: {
                label: "Discord Offline",
                channel: "discord",
                severity: "critical",
                message:
                    ":rotating_light: [{server.client.name}] {server.name} is still offline! (for {runtime.offlineDuration})\n\nEvent: <t:{runtime.eventTimestampUnix}:f>\n<if-repeat>\nFirst Trigger: <t:{runtime.firstTriggerTimestampUnix}:f>\n</if-repeat>\n<if-repeat>\n<discord-footer>Server Monitoring System · repeat: {runtime.repeat.countOfMessage} of {runtime.repeat.max} ({runtime.repeat.interval})</discord-footer>\n</if-repeat>\n" +
                    '<discord-button url="{server.url}">View Server Details</discord-button>',
            },
        },
        {
            id: "metric_ports",
            type: "metric",
            position: { x: -300, y: 1100 },
            settings: { label: "Ports Ping", metric_type: "ports_ping" },
        },
        {
            id: "ping_slow_threshold",
            type: "template",
            position: { x: -300, y: 1270 },
            settings: {
                label: "Ping slow threshold ms",
                template_id: "port_ping_slow_threshold_ms",
                value: "200",
                data_type: "number",
            },
        },
        {
            id: "compare_ping",
            type: "condition",
            position: { x: -60, y: 1100 },
            settings: {
                label: "Ping > threshold",
                operator: "greater_than",
                threshold: 200,
                min: 0,
                max: 0,
            },
        },
        {
            id: "sustained_ping",
            type: "sustained",
            position: { x: 200, y: 1100 },
            settings: { label: "Sustained 10s", duration: "10000" },
        },
        {
            id: "discord_ping",
            type: "notification",
            position: { x: 460, y: 1100 },
            settings: {
                label: "Discord Ping Slow",
                channel: "discord",
                severity: "warning",
                message:
                    ":rotating_light: [{server.client.name}] {server.name} — port {runtime.port} ({runtime.portName}) ping **{runtime.ping} ms** is above the **{runtime.threshold} ms** threshold!\n\nEvent: <t:{runtime.eventTimestampUnix}:f>",
            },
        },
        {
            id: "check_after_ping",
            type: "check_after",
            position: { x: -60, y: 1390 },
            settings: {
                label: "Check After 10s",
                duration: "10000",
                repeat_interval: "10000",
                repeat_max_repeats: -1,
            },
        },
        {
            id: "discord_ping_off",
            type: "notification",
            position: { x: 200, y: 1390 },
            settings: {
                label: "Discord Port Unreachable",
                channel: "discord",
                severity: "critical",
                message:
                    ":rotating_light: [{server.client.name}] {server.name} — port {runtime.port} ({runtime.portName}) is unreachable.\n\nEvent: <t:{runtime.eventTimestampUnix}:f>",
            },
        },
    ],
    edges: [
        {
            id: "e_cpu_85",
            source: "metric_cpu",
            target: "compare_85",
            sourceHandle: "output",
            targetHandle: "input-a",
        },
        {
            id: "e_mem_85",
            source: "metric_memory",
            target: "compare_85",
            sourceHandle: "output",
            targetHandle: "input-a",
        },
        {
            id: "e_disk_85",
            source: "metric_disk",
            target: "compare_85",
            sourceHandle: "output",
            targetHandle: "input-a",
        },
        {
            id: "e_net_85",
            source: "metric_network",
            target: "compare_85",
            sourceHandle: "output",
            targetHandle: "input-a",
        },
        {
            id: "e_85_s10",
            source: "compare_85",
            target: "sustained_10",
            sourceHandle: "output",
            targetHandle: "input",
        },
        {
            id: "e_s10_s20",
            source: "sustained_10",
            target: "sustained_20",
            sourceHandle: "chain-out",
            targetHandle: "chain-in",
        },
        {
            id: "e_s20_s30",
            source: "sustained_20",
            target: "sustained_30",
            sourceHandle: "chain-out",
            targetHandle: "chain-in",
        },
        {
            id: "e_s10_email10",
            source: "sustained_10",
            target: "email_10",
            sourceHandle: "output",
            targetHandle: "input",
        },
        {
            id: "e_s20_email20",
            source: "sustained_20",
            target: "email_20",
            sourceHandle: "output",
            targetHandle: "input",
        },
        {
            id: "e_s30_discord",
            source: "sustained_30",
            target: "discord_30",
            sourceHandle: "output",
            targetHandle: "input",
        },
        {
            id: "e_off_email",
            source: "metric_status",
            target: "email_offline",
            sourceHandle: "offline",
            targetHandle: "input",
        },
        {
            id: "e_off_check",
            source: "metric_status",
            target: "check_after_10m",
            sourceHandle: "offline",
            targetHandle: "input",
        },
        {
            id: "e_check_discord",
            source: "check_after_10m",
            target: "discord_offline",
            sourceHandle: "output",
            targetHandle: "input",
        },
        {
            id: "e_ping_timing",
            source: "metric_ports",
            target: "compare_ping",
            sourceHandle: "timing",
            targetHandle: "input-a",
        },
        {
            id: "e_ping_threshold",
            source: "ping_slow_threshold",
            target: "compare_ping",
            sourceHandle: "output",
            targetHandle: "input-b",
        },
        {
            id: "e_ping_cond",
            source: "compare_ping",
            target: "sustained_ping",
            sourceHandle: "output",
            targetHandle: "input",
        },
        {
            id: "e_ping_sustain",
            source: "sustained_ping",
            target: "discord_ping",
            sourceHandle: "output",
            targetHandle: "input",
        },
        {
            id: "e_ping_off",
            source: "metric_ports",
            target: "check_after_ping",
            sourceHandle: "offline",
            targetHandle: "input",
        },
        {
            id: "e_ping_check",
            source: "check_after_ping",
            target: "discord_ping_off",
            sourceHandle: "output",
            targetHandle: "input",
        },
    ],
};

export function DocsAlertsContent() {
    return (
        <>
            <Section title="Overview — what the alert engine is">
                <p>
                    Alerts are a <strong>visual node graph</strong> compiled to
                    branches. Each branch is{" "}
                    <InlineCode>
                        metric → condition → timing → action → post_action
                    </InlineCode>{" "}
                    where <InlineCode>timing</InlineCode> is{" "}
                    <InlineCode>sustained</InlineCode>/
                    <InlineCode>check_after</InlineCode> and{" "}
                    <InlineCode>post_action</InlineCode> is{" "}
                    <InlineCode>repeat</InlineCode>. The engine is poll-driven
                    and per-server: every heartbeat and every offline check
                    triggers the branches that watch that metric for that
                    server, with a latch so each incident fires once.
                </p>
                <p>
                    See the editor for node types and wiring —{" "}
                    <InlineCode>NodeConfigEditor</InlineCode> +{" "}
                    <InlineCode>NodePalette</InlineCode> +{" "}
                    <InlineCode>NodeSettingsPanel</InlineCode> — and the code
                    map below for where each piece lives.
                </p>
            </Section>

            <Section title="Default Alert Graph — seeded">
                <p className="mb-4">
                    <InlineCode>NodeConfigSeeder</InlineCode> seeds one global
                    config with three families:{" "}
                    <strong>metrics ≥85% chained 10s→20s→30s+repeat</strong>,{" "}
                    <strong>server_status offline</strong>, and{" "}
                    <strong>ports_ping</strong> (slow vs unreachable). It
                    mirrors the <InlineCode>alertGraph</InlineCode> below — drag
                    to explore.
                </p>
                <div className="h-[520px] rounded-xl border border-border/60 bg-card overflow-hidden">
                    <NodeConfigEditor
                        config={alertGraph}
                        previewOnly
                        alwaysMaximized
                        showControls={false}
                        showMinimap={false}
                        showNodeTypesSidebar={false}
                    />
                </div>
                <Callout>
                    <InlineCode>metric_network</InlineCode> now feeds the same{" "}
                    <InlineCode>compare_85</InlineCode> as CPU/memory/disk —
                    network is per-interface (
                    <InlineCode>networks_dict</InlineCode> +{" "}
                    <InlineCode>available_interfaces</InlineCode>) but the alert
                    metric <InlineCode>network_usage</InlineCode> is the host’s
                    aggregate <InlineCode>rx_bytes</InlineCode> sum, so one
                    threshold covers all interfaces.
                </Callout>
            </Section>

            <Section title="Full Flow — install to alert to detach/uninstall">
                <ol className="list-decimal pl-5 space-y-2">
                    <li>
                        <strong>Install:</strong> dashboard →{" "}
                        <InlineCode>Generate Installation Command</InlineCode>{" "}
                        (one-time <InlineCode>ProvisionToken</InlineCode> 30
                        min) → run on host — installer creates{" "}
                        <InlineCode>config.json</InlineCode> with{" "}
                        <InlineCode>installation_id</InlineCode> + token → agent
                        registers (
                        <InlineCode>POST /api/v1/register</InlineCode> with
                        public key) → token stripped.
                    </li>
                    <li>
                        <strong>Auth:</strong> challenge-response (
                        <InlineCode>/auth/challenge</InlineCode> → sign →{" "}
                        <InlineCode>/auth/verify</InlineCode> → JWT 900s, memory
                        only). Auth response carries{" "}
                        <InlineCode>
                            servers: [
                            {`{server_uuid, port_filter, process_filter, network_filter}`}
                            ]
                        </InlineCode>{" "}
                        and <InlineCode>heartbeat_interval</InlineCode> — builds{" "}
                        <InlineCode>runtime.go</InlineCode> in-memory per-server
                        filters.
                    </li>
                    <li>
                        <strong>Heartbeat (at once):</strong> every{" "}
                        <InlineCode>5s</InlineCode> one{" "}
                        <InlineCode>POST /api/v1/agent/heartbeat</InlineCode>{" "}
                        with top-level{" "}
                        <InlineCode>
                            cpu/memory/disk/uptime/agent_config
                        </InlineCode>{" "}
                        + deduped{" "}
                        <InlineCode>
                            processes_dict/ports_dict/networks_dict
                        </InlineCode>{" "}
                        and per-server key lists (
                        <InlineCode>
                            servers: [
                            {`{server_uuid, processes:[names], open_db_ports:["tcp:5432"], network:["Wi-Fi"]}`}
                            ]
                        </InlineCode>
                        ).{" "}
                        <InlineCode>
                            available_processes/ports/interfaces
                        </InlineCode>{" "}
                        (details-only, no live data) are sent only on signature
                        change.
                    </li>
                    <li>
                        <strong>Backend ingest:</strong>{" "}
                        <InlineCode>AgentController::heartbeat</InlineCode> →{" "}
                        <InlineCode>HeartbeatService::processAgent</InlineCode>{" "}
                        — one <InlineCode>Heartbeat</InlineCode> row per tick
                        (not per server), <InlineCode>MetricSample</InlineCode>{" "}
                        + <InlineCode>ServerUpdate</InlineCode> per server
                        (totals + <InlineCode>server_network_stats</InlineCode>{" "}
                        per-interface), <InlineCode>available_*</InlineCode>{" "}
                        stored on <InlineCode>Agent</InlineCode> for filter UI,
                        then per-server{" "}
                        <InlineCode>EvaluateNodeConfig</InlineCode> dispatched
                        per metric.
                    </li>
                    <li>
                        <strong>Alert trigger:</strong>{" "}
                        <InlineCode>EvaluateNodeConfig</InlineCode> job →{" "}
                        <InlineCode>
                            NodeConfigEngine::trigger(metricNodeId, value,{" "}
                            {`{server_id, metric_type}`})
                        </InlineCode>{" "}
                        → edge-triggered latch + timing chain → timers.
                    </li>
                    <li>
                        <strong>Timers → notifications:</strong>{" "}
                        <InlineCode>NodeTaskScheduler</InlineCode> inserts{" "}
                        <InlineCode>node_config_tasks</InlineCode> (`run_at =
                        now+delay`), <InlineCode>FireNodeTimer</InlineCode>{" "}
                        (queue) re-evaluates with{" "}
                        <InlineCode>timer_fire:true</InlineCode> and historical
                        DB check, then <InlineCode>SendNotification</InlineCode>{" "}
                        (`MUTE_NOTIFICATION` check, template rendering).
                    </li>
                    <li>
                        <strong>Detach vs uninstall:</strong> host command{" "}
                        <InlineCode>
                            detach.ps1/sh -Instance &lt;uuid&gt; -Server
                            &lt;server-uuid&gt;
                        </InlineCode>{" "}
                        → <InlineCode>detach.flag</InlineCode> →{" "}
                        <InlineCode>
                            POST
                            /api/v1/agent/servers/&#123;uuid&#125;/uninstall
                        </InlineCode>{" "}
                        (agent JWT, one server) →{" "}
                        <InlineCode>AgentUninstalled</InlineCode> for that
                        server only, agent stays for others (until last server
                        detached, then it idles with zero servers). Full
                        uninstall{" "}
                        <InlineCode>
                            uninstall.ps1/sh -Instance &lt;uuid&gt;
                        </InlineCode>{" "}
                        → <InlineCode>uninstall.flag</InlineCode> →{" "}
                        <InlineCode>POST /api/v1/agent/uninstall</InlineCode> →
                        revokes agent + all servers. Both are marker-based and
                        host-validated (service account keystore).
                    </li>
                    <li>
                        <strong>Who sends what:</strong> the{" "}
                        <strong>agent</strong> initiates{" "}
                        <InlineCode>detach</InlineCode>/
                        <InlineCode>uninstall</InlineCode> POSTs (proving the
                        key); the <strong>dashboard</strong>’s{" "}
                        <InlineCode>DeleteModal</InlineCode> and{" "}
                        <InlineCode>AgentTab</InlineCode> for multi-server only
                        show the host commands for validation — direct dashboard{" "}
                        <InlineCode>DELETE</InlineCode> without host is blocked
                        (<InlineCode>422</InlineCode> until the host flag is
                        handled). After detach/uninstall the server flips to{" "}
                        <InlineCode>Agent Uninstalled</InlineCode> in real time
                        via <InlineCode>AgentUninstalled</InlineCode> +{" "}
                        <InlineCode>ServerStatusUpdated</InlineCode> WebSocket.
                    </li>
                </ol>
                <Callout type="warning">
                    Detaching the last server does <strong>not</strong>{" "}
                    auto-revoke the agent — it stays installed with zero servers
                    until a full <InlineCode>uninstall</InlineCode>. The UI
                    shows <InlineCode>Agent Uninstalled</InlineCode> for the
                    detached server but keeps last agent data (via{" "}
                    <InlineCode>ServerData</InlineCode> fallback) until
                    re-provisioned.
                </Callout>
            </Section>

            <Section title="Alert Flow Walkthrough — CPU 92% (chained 10s→20s→30s+repeat)">
                <ol className="list-decimal list-inside ml-2 space-y-2">
                    <li>
                        <strong>t=0 poll:</strong>{" "}
                        <InlineCode>MonitorServer</InlineCode> (every minute via{" "}
                        <InlineCode>system:monitor</InlineCode>) fetches latest{" "}
                        <InlineCode>cpu.load1=92.5</InlineCode> →{" "}
                        <InlineCode>
                            engine.trigger("metric_cpu", 92.5, {`{server_id}`})
                        </InlineCode>
                        .
                    </li>
                    <li>
                        <strong>Condition:</strong>{" "}
                        <InlineCode>compare_85</InlineCode> `92.5 ≥ 85` → true →
                        latch `cpu:output` armed.
                    </li>
                    <li>
                        <strong>Timing chain arm:</strong>{" "}
                        <InlineCode>sustained_10</InlineCode> receives true →
                        <InlineCode>NodeTaskScheduler</InlineCode> inserts
                        `delayMs=10000` for `sustained_10` (chain root).
                    </li>
                    <li>
                        <strong>t=10s FireNodeTimer:</strong> re-checks DB
                        `MetricSample` window `now-10s` still `≥85` →{" "}
                        <InlineCode>email_10</InlineCode> fires, cascades to
                        `sustained_20` timer `10000` (cumulative 20s).
                    </li>
                    <li>
                        <strong>t=20s:</strong> `sustained_20` DB check still
                        true → `email_20` fires, arms `sustained_30` (`30000`
                        cumulative).
                    </li>
                    <li>
                        <strong>t=30s:</strong> `sustained_30` fires →
                        `discord_30` fires and, because it has{" "}
                        <InlineCode>
                            repeat_interval:10000 repeat_max:-1
                        </InlineCode>
                        , schedules repeat timer.
                    </li>
                    <li>
                        <strong>t=40s,50s…:</strong> `fireChainRepeat` re-checks
                        only the last step’s DB window (expanding sustain) →{" "}
                        `discord_30` repeats every `10s` until
                        `liveConditionStillHolds` fails (CPU drops), then
                        `resetChain` to `idle`.
                    </li>
                </ol>
                <p>
                    Server-status branch is separate:{" "}
                    <InlineCode>metric_status:offline</InlineCode> →{" "}
                    <InlineCode>email_offline</InlineCode> immediately +{" "}
                    <InlineCode>check_after 10s</InlineCode> →{" "}
                    <InlineCode>discord_offline</InlineCode> (debounce), and{" "}
                    <InlineCode>ports_ping</InlineCode> branch uses{" "}
                    <InlineCode>
                        metric_ports:timing → compare_ping (threshold via
                        TemplateNode)
                    </InlineCode>{" "}
                    → <InlineCode>sustained_ping 10s</InlineCode> →{" "}
                    <InlineCode>discord_ping</InlineCode>.
                </p>
            </Section>

            <Section title="Config Resolution (global → client → server)">
                <p>
                    `NodeConfigCache::resolveForServer(uuid)` picks the most
                    specific config: <InlineCode>server</InlineCode> →{" "}
                    <InlineCode>client</InlineCode> →{" "}
                    <InlineCode>global</InlineCode>{" "}
                    (`scope_type`/`scope_id`/`slug`). The editor saves via{" "}
                    <InlineCode>NodeConfigController::update</InlineCode> →{" "}
                    <InlineCode>NodeConfigValidator</InlineCode> (no cycles,
                    valid edges) →{" "}
                    <InlineCode>NodeConfigCompiler::compile</InlineCode> →{" "}
                    <InlineCode>compiled_config.branches</InlineCode> cached and
                    `warm`.
                </p>
            </Section>

            <Section title="Code Architecture — Engine">
                <SubSection title="Entry Points">
                    <p>
                        <InlineCode>system:monitor</InlineCode>{" "}
                        (`routes/console.php` everyMinute) →{" "}
                        <InlineCode>MonitorServer</InlineCode> per server →{" "}
                        <InlineCode>
                            NodeConfigCache::resolveForServer
                        </InlineCode>{" "}
                        → <InlineCode>engine.trigger</InlineCode> per metric (
                        <InlineCode>
                            server_status, cpu, memory, disk, network_usage,
                            ports_ping
                        </InlineCode>
                        ). Heartbeat path does the same via{" "}
                        <InlineCode>
                            HeartbeatService::evaluateMetricsForNodeConfig
                        </InlineCode>{" "}
                        + <InlineCode>CheckServerOffline</InlineCode> (`delay
                        offline_threshold+2s`).
                    </p>
                    <CodeBlock>{`// routes/console.php
Schedule::command('system:monitor')->everyMinute();

// MonitorServer::handle()
$config = NodeConfigCache::resolveForServer($server->uuid);
foreach (['server_status','cpu_usage','memory_usage','disk_usage','network_usage','ports_ping'] as $metric) {
    $nodeId = $engine->findMetricNode($config, $metric);
    EvaluateNodeConfig::dispatch($config->id, $nodeId, $value, ['server_id'=>$server->id]);
}`}</CodeBlock>
                </SubSection>

                <SubSection title="Engine: trigger() — app/NodeConfig/Engine/NodeConfigEngine.php:49">
                    <ol className="list-decimal list-inside ml-2 space-y-1">
                        <li>
                            Find `branches` where `metric_node_id ==
                            sourceNodeId` + `metric_source_handle` (`output` vs
                            `timing` for `ports_ping`).
                        </li>
                        <li>
                            `evaluateBranch`: `MetricNode` → `ConditionNode`
                            (once, with `template_refs` override for
                            `threshold/min/max`) → branch latch `branch:
                            {`{metric:handle}`}` `armed` in `NodeConfigState`
                            (edge-triggered, no implicit repeat; clears only
                            when `condition==false &&
                            !branchHasActiveEvaluation`).
                        </li>
                        <li>
                            `evaluateSubBranch`: `timing` (`SustainedNode`
                            state-machine `idle→pending→firing`) → `action`
                            (`NotificationNode`) → `post_action`
                            (`RepeatNode`/`CheckAfterNode`) — each returns
                            `NodeResult {"{"}shouldPropagate, value, timer,
                            state{"}"}`.
                        </li>
                        <li>
                            Collect `timers[]` (`node_config_tasks`) +
                            `actions[]` (`ActionItem` via `NotificationNode`).
                        </li>
                    </ol>
                </SubSection>

                <SubSection title="Timer Scheduling">
                    <p>
                        `SustainedNode`/`RepeatNode`/`CheckAfterNode` return{" "}
                        <InlineCode>
                            NodeResult::withTimer(NodeTimer{"{"}delayMs, context
                            {"}"})
                        </InlineCode>
                        . Caller (`MonitorServer`/`EvaluateNodeConfig`) does:
                    </p>
                    <CodeBlock>{`foreach ($result['timers'] as $timer) {
    FireNodeTimer::dispatch($timer['node_config_id'], $timer['node_id'], $timer['context'])
        ->delay(now()->addMilliseconds($timer['delay_ms']));
}`}</CodeBlock>
                    <p>
                        `FireNodeTimer::handle` calls{" "}
                        <InlineCode>
                            engine.fireTimer(config, nodeId, context, serverId)
                        </InlineCode>{" "}
                        with <InlineCode>timer_fire:true</InlineCode>. For
                        `repeat` with `sustained` ancestor it calls{" "}
                        <InlineCode>retriggerFromSource</InlineCode> —
                        re-triggers the metric source with{" "}
                        <InlineCode>extra_sustain_seconds</InlineCode> so the
                        window expands.
                    </p>
                </SubSection>

                <SubSection title="Node Types — app/NodeConfig/NodeTypes/*">
                    <table className="w-full text-sm border border-border/40 rounded-lg overflow-hidden">
                        <thead className="bg-muted/30">
                            <tr>
                                <th className="text-left px-3 py-2">type</th>
                                <th className="text-left px-3 py-2">
                                    evaluate
                                </th>
                                <th className="text-left px-3 py-2">timer</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    metric
                                </td>
                                <td className="px-3 py-1.5">
                                    passthrough `metric_value`
                                </td>
                                <td className="px-3 py-1.5">—</td>
                            </tr>
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    condition / severity
                                </td>
                                <td className="px-3 py-1.5">
                                    `value {(">", "<", "between")} threshold` →
                                    `bool` / severity string
                                </td>
                                <td className="px-3 py-1.5">—</td>
                            </tr>
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    sustained
                                </td>
                                <td className="px-3 py-1.5">
                                    `phase idle→pending→firing`; DB check
                                    `MetricSample` window `now-duration` %
                                    violating ≥ `minMatch`
                                </td>
                                <td className="px-3 py-1.5">
                                    delay `duration`
                                </td>
                            </tr>
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    check_after
                                </td>
                                <td className="px-3 py-1.5">
                                    immediate `false` → timer, on fire re-check
                                    live condition
                                </td>
                                <td className="px-3 py-1.5">delay</td>
                            </tr>
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    repeat
                                </td>
                                <td className="px-3 py-1.5">
                                    interval `repeat_interval` until
                                    `repeat_max` (-1 infinite), `cancelTimers`
                                    on `value==false`
                                </td>
                                <td className="px-3 py-1.5">interval</td>
                            </tr>
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    notification
                                </td>
                                <td className="px-3 py-1.5">
                                    `value==true` → `ActionItem` with
                                    `upstream_context` (sustain_value,
                                    repeat_count)
                                </td>
                                <td className="px-3 py-1.5">—</td>
                            </tr>
                            <tr>
                                <td className="px-3 py-1.5 font-mono text-xs">
                                    logic / template
                                </td>
                                <td className="px-3 py-1.5">
                                    `and/or/not`; template resolves `
                                    {"{server.name}"}` via `extra_state`
                                </td>
                                <td className="px-3 py-1.5">—</td>
                            </tr>
                        </tbody>
                    </table>
                </SubSection>

                <SubSection title="State Persistence — node_config_states">
                    <p>
                        Each `NodeResult.state` is `updateOrCreate` on{" "}
                        <InlineCode>{`{node_config_id, node_id[:metric], server_id}`}</InlineCode>{" "}
                        via <InlineCode>NodeConfigState</InlineCode>. Scoped
                        keys <InlineCode>sustained_10:memory_usage</InlineCode>{" "}
                        win over bare <InlineCode>sustained_10</InlineCode>{" "}
                        (two-pass `loadStates`). Branch latch{" "}
                        <InlineCode>branch:{`{metric:handle}`}</InlineCode>{" "}
                        `armed` prevents re-fire until condition clears.
                    </p>
                </SubSection>

                <SubSection title="Jobs & Notifications">
                    <ul className="list-disc pl-5 space-y-1.5">
                        <li>
                            <InlineCode>EvaluateNodeConfig</InlineCode> —
                            triggered per metric, schedules timers + dispatches{" "}
                            <InlineCode>SendNotification</InlineCode> for
                            `actions`.
                        </li>
                        <li>
                            <InlineCode>FireNodeTimer</InlineCode> — delayed
                            queue job, `liveConditionStillHolds` re-check, then
                            `SendNotification` with expanded sustain.
                        </li>
                        <li>
                            <InlineCode>SendNotification</InlineCode> —
                            `MUTE_NOTIFICATION` guard, `TemplateNode` rendering
                            (`server.name`, `metricName`, `sustainValue`,
                            `repeat.countOfMessage`), `mail`/`discord` via{" "}
                            <InlineCode>
                                NodeConfigNotificationService
                            </InlineCode>
                            .
                        </li>
                        <li>
                            <InlineCode>CheckServerOffline</InlineCode> — per
                            heartbeat `delay(offline+2s)`, on offline triggers{" "}
                            <InlineCode>server_status:offline</InlineCode>{" "}
                            branch.
                        </li>
                    </ul>
                </SubSection>

                <SubSection title="Key Files">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border border-border/40 rounded-lg overflow-hidden">
                            <thead className="bg-muted/30">
                                <tr>
                                    <th className="text-left px-3 py-2">
                                        File
                                    </th>
                                    <th className="text-left px-3 py-2">
                                        Role
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                <tr>
                                    <td className="px-3 py-1.5 font-mono text-xs">
                                        NodeConfigEngine.php:49 / fireTimer:382
                                    </td>
                                    <td className="px-3 py-1.5">
                                        trigger, latch, chain, repeat
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-3 py-1.5 font-mono text-xs">
                                        NodeConfigCompiler.php
                                    </td>
                                    <td className="px-3 py-1.5">
                                        nodes/edges → branches + timing_chain
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-3 py-1.5 font-mono text-xs">
                                        SustainedNode.php / RepeatNode.php
                                    </td>
                                    <td className="px-3 py-1.5">
                                        phase state-machine + DB window
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-3 py-1.5 font-mono text-xs">
                                        NodeTaskScheduler.php
                                    </td>
                                    <td className="px-3 py-1.5">
                                        node_config_tasks run_at
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-3 py-1.5 font-mono text-xs">
                                        MonitorServer.php /
                                        HeartbeatService.php:783
                                    </td>
                                    <td className="px-3 py-1.5">
                                        per-server trigger entry points
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-3 py-1.5 font-mono text-xs">
                                        NodeConfigEditor.tsx / NodeSettingsPanel
                                    </td>
                                    <td className="px-3 py-1.5">
                                        visual editor, template vars, validation
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </SubSection>
            </Section>
        </>
    );
}
