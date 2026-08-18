import { NodeConfigEditor } from "@/components/node-config/NodeConfigEditor";
import type { NodeConfigGraph } from "@/types/node-config";
import {
    Section,
    SubSection,
    CodeBlock,
    InlineCode,
    Callout,
} from "@/components/docs/Section";

// ── Static graph data (mirrors NodeConfigSeeder) ──────────────────

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
                subject:
                    "[{server.client.name}] {server.name} - Offline Alert",
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

// ── Content ───────────────────────────────────────────────────────

export function DocsAlertsContent() {
    return (
        <>
            <Section title="Overview">
                <p>
                    This is the engine behind the alert configs you build in
                    the visual editor. For how to use the editor itself —
                    every node type, wiring, scopes, and template variables —
                    see the <strong>Alert Config Editor</strong> section in the
                    User Guide. Here we look at how the engine evaluates a
                    graph, how timers fire, and how state persists across
                    polls.
                </p>
                <p>
                    The engine is poll-driven. The{" "}
                    <InlineCode>system:monitor</InlineCode> scheduled command
                    runs every minute and dispatches a{" "}
                    <InlineCode>MonitorServer</InlineCode> job per server. Each
                    job resolves the server's config and calls{" "}
                    <InlineCode>NodeConfigEngine::trigger()</InlineCode> for
                    every metric source node (server_status, cpu, memory, disk,
                    ports ping).
                </p>
            </Section>

            <Section title="Default Alert Graph">
                <p className="mb-4">
                    This is the default alert pipeline seeded into the system.
                    It has three branches: metrics above 85% (chained sustained
                    gates at 10s / 20s / 30s with a repeat on the last one), a
                    server-offline branch, and a ports-ping branch.
                </p>
                <div className="h-100 rounded-xl border border-border/60 bg-card overflow-hidden">
                    <NodeConfigEditor
                        config={alertGraph}
                        previewOnly
                        alwaysMaximized
                        showControls={false}
                        showMinimap={false}
                        showNodeTypesSidebar={false}
                    />
                </div>
            </Section>

            <Section title="Alert Flow Walkthrough">
                <p>
                    Here is what happens when CPU usage hits 92% on a server
                    (using the default seeded graph):
                </p>
                <ol className="list-decimal list-inside ml-2 space-y-2">
                    <li>
                        <strong>t=0 (poll):</strong>{" "}
                        <InlineCode>system:monitor</InlineCode> runs.
                        <InlineCode>MonitorServer</InlineCode> fetches the
                        latest CPU sample (92.5) and calls{" "}
                        <InlineCode>engine::trigger()</InlineCode>.
                    </li>
                    <li>
                        <strong>Condition node:</strong> 92.5 ≥ 85 → true.
                    </li>
                    <li>
                        <strong>Chained sustained stack:</strong> the first
                        sustained node (10s) receives true and dispatches a{" "}
                        <InlineCode>FireNodeTimer</InlineCode>; the 20s and 30s
                        nodes are chained behind it via Chain In / Chain Out and
                        arm sequentially.
                    </li>
                    <li>
                        <strong>t=10s:</strong> 10s timer fires → re-checks the
                        historical condition against the database → still true →{" "}
                        <InlineCode>email_10</InlineCode> fires and the 20s node
                        arms.
                    </li>
                    <li>
                        <strong>t=20s:</strong> 20s timer fires →{" "}
                        <InlineCode>email_20</InlineCode> fires and the 30s node
                        arms.
                    </li>
                    <li>
                        <strong>t=30s:</strong> 30s timer fires →{" "}
                        <InlineCode>discord_30</InlineCode> fires. Because the
                        30s node has the Repeat capability (every 10s, infinite),
                        its repeat timer starts.
                    </li>
                    <li>
                        <strong>t=40s, 50s, 60s…:</strong> the repeat fires every
                        10s. Each time,{" "}
                        <InlineCode>retriggerFromSource()</InlineCode> re-evaluates
                        the full graph with an expanding sustain window (40s, 50s,
                        60s…). If CPU drops below 85%, the historical check fails
                        and the repeat stops.
                    </li>
                </ol>
                <p>
                    In parallel, the server-status branch watches heartbeats:
                    when the server goes offline, <InlineCode>email_offline</InlineCode>{" "}
                    fires immediately and a Check After node starts a 10s timer
                    before the <InlineCode>discord_offline</InlineCode> message —
                    debouncing flapping.
                </p>
            </Section>

            <Section title="Config Resolution">
                <p>
                    Alerts can be scoped at three levels. When evaluating, the
                    system picks the most specific config:
                </p>
                <ol className="list-decimal list-inside ml-2 space-y-1">
                    <li>
                        <strong>Server-scoped</strong> — applies to one specific
                        server.
                    </li>
                    <li>
                        <strong>Client-scoped</strong> — applies to all servers
                        in a client.
                    </li>
                    <li>
                        <strong>Global</strong> — fallback for all servers.
                    </li>
                </ol>
                <Callout>
                    <strong>Tip:</strong> Create a global config with default
                    thresholds, then override per-server for machines that need
                    tighter or looser alerts.
                </Callout>
            </Section>

            <Section title="Code Architecture">
                <SubSection title="Entry Points">
                    <p>
                        The scheduled command{" "}
                        <InlineCode>system:monitor</InlineCode> (defined in{" "}
                        <InlineCode>routes/console.php</InlineCode>) runs every
                        minute and dispatches{" "}
                        <InlineCode>MonitorServer</InlineCode> jobs.
                    </p>
                    <CodeBlock>{`// routes/console.php
Schedule::command('system:monitor')->everyMinute();

// app/Console/Commands/SystemMonitor.php
public function handle(): int
{
    $servers = Server::all();
    foreach ($servers as $server) {
        MonitorServer::dispatch($server->uuid);
    }
    return 0;
}`}</CodeBlock>
                    <p>
                        <InlineCode>MonitorServer</InlineCode> resolves the
                        config via{" "}
                        <InlineCode>
                            NodeConfigCache::resolveForServer()
                        </InlineCode>
                        , then calls{" "}
                        <InlineCode>engine::trigger()</InlineCode> for each
                        metric (server_status, cpu, memory, disk).
                    </p>
                </SubSection>

                <SubSection title="Engine: trigger()">
                    <p>
                        <InlineCode>
                            NodeConfigEngine::trigger()
                        </InlineCode>{" "}
                        at{" "}
                        <InlineCode>
                            app/NodeConfig/Engine/NodeConfigEngine.php:42
                        </InlineCode>{" "}
                        is the core. It:
                    </p>
                    <ol className="list-decimal list-inside ml-2 space-y-1">
                        <li>Validates the graph (no cycles, valid edges).</li>
                        <li>Topologically sorts nodes.</li>
                        <li>
                            Builds condition and repeat contexts (maps
                            SustainedNode → upstream ConditionNode settings,
                            RepeatNode → SustainedNode ancestor info).
                        </li>
                        <li>
                            Evaluates each node in order, passing upstream
                            outputs as inputs.
                        </li>
                        <li>
                            Collects timers (delayed callbacks) and actions
                            (notifications) from results.
                        </li>
                    </ol>
                    <CodeBlock>{`// Simplified evaluation loop
foreach ($order as $nodeId) {
    $handler = $this->registry->get($node['type']);
    $result = $handler->evaluate($inputValues, $node['settings'], $currentState);

    NodeConfigState::updateOrCreate(
        ['node_config_id' => $config->id, 'node_id' => $nodeId],
        ['context' => $result->state],
    );

    if ($result->timer !== null) {
        $timers[] = ['node_id' => $nodeId, 'delay_ms' => $result->timer->delayMs];
    }
}`}</CodeBlock>
                </SubSection>

                <SubSection title="Timer-Based Scheduling">
                    <p>
                        Both SustainedNode and RepeatNode use the same
                        mechanism: they return a{" "}
                        <InlineCode>NodeResult::withTimer()</InlineCode>{" "}
                        containing a{" "}
                        <InlineCode>NodeTimer(delayMs, context)</InlineCode>.
                    </p>
                    <p>
                        The caller (
                        <InlineCode>MonitorServer</InlineCode> or{" "}
                        <InlineCode>EvaluateNodeConfig</InlineCode>) dispatches{" "}
                        <InlineCode>FireNodeTimer</InlineCode> as a delayed
                        Laravel queue job:
                    </p>
                    <CodeBlock>{`// MonitorServer.php / EvaluateNodeConfig.php
foreach ($result['timers'] as $timer) {
    FireNodeTimer::dispatch(
        $timer['node_config_id'],
        $timer['node_id'],
        $timer['context'],
    )->delay(now()->addMilliseconds($timer['delay_ms']));
}`}</CodeBlock>
                    <p>
                        <InlineCode>FireNodeTimer</InlineCode> calls{" "}
                        <InlineCode>engine::fireTimer()</InlineCode>, which
                        re-evaluates the node with{" "}
                        <InlineCode>timer_fire = true</InlineCode> in state. If
                        the node propagates, downstream nodes are processed. For
                        RepeatNodes with a Sustained ancestor, it calls{" "}
                        <InlineCode>retriggerFromSource()</InlineCode> instead,
                        which re-evaluates the entire graph from the metric
                        source with accumulated sustain time.
                    </p>
                    <CodeBlock>{`// FireNodeTimer.php
public function handle(NodeRegistry $registry, NodeConfigNotificationService $notifications): void
{
    $config = NodeConfigCache::findById($this->configId);
    $engine = new NodeConfigEngine($registry);
    $result = $engine->fireTimer($config, $this->nodeId, $this->context);

    // Chain next timer
    foreach ($result['timers'] ?? [] as $timer) {
        FireNodeTimer::dispatch(...)
            ->delay(now()->addMilliseconds($timer['delay_ms']));
    }

    $notifications->dispatchActions($result['actions'] ?? []);
}`}</CodeBlock>
                </SubSection>

                <SubSection title="SustainedNode Timer Flow">
                    <p>
                        The SustainedNode uses a{" "}
                        <InlineCode>timer_pending</InlineCode> flag (persisted
                        in <InlineCode>NodeConfigState</InlineCode>) to track
                        whether a timer has been dispatched:
                    </p>
                    <CodeBlock>{`// SustainedNode::evaluate() — timer-based path
if ($conditionMet && !$timerPending) {
    // First time true: dispatch timer for sustain duration
    $delayMs = $requiredSeconds * 1000;
    return NodeResult::withTimer(true,
        new NodeTimer($delayMs, ['sustain_fire' => true]),
        ['timer_pending' => true, 'already_fired' => false]
    );
}

if ($conditionMet && $timerPending) {
    // Timer already dispatched, skip
    return NodeResult::noPropagate(null, $state);
}

// Timer fire: re-check historical DB condition
if ($isTimerFire) {
    $conditionMet = $this->checkHistoricalCondition(...);
    if ($conditionMet) {
        return NodeResult::propagate(true, ['timer_pending' => false, 'already_fired' => true]);
    }
    return NodeResult::propagate(false, ['timer_pending' => false]);
}`}</CodeBlock>
                </SubSection>

                <SubSection title="Historical Condition Check">
                    <p>
                        When the SustainedNode's timer fires, it queries the{" "}
                        <InlineCode>metric_samples</InlineCode> table for all
                        samples within the sustain window and checks what
                        percentage violate the threshold:
                    </p>
                    <CodeBlock>{`// SustainedNode::checkMetricCondition()
$since = now()->subSeconds($requiredSeconds);

$sampleCount = MetricSample::whereHas('batch', fn($q) =>
    $q->where('agent_id', $agent->id)
      ->where('recorded_at', '>=', $since)
)->count();

$violatingCount = MetricSample::whereHas('batch', fn($q) =>
    $q->where('agent_id', $agent->id)
      ->where('recorded_at', '>=', $since)
)->where(fn($q) => match ($operator) {
    'greater_than' => $q->where('value', '>', $threshold),
    'less_than'    => $q->where('value', '<', $threshold),
    // ...
})->count();

return ($violatingCount / $sampleCount) * 100 >= $minMatchPercent;`}</CodeBlock>
                </SubSection>

                <SubSection title="Repeat + Sustained Interaction">
                    <p>
                        When a RepeatNode has a SustainedNode ancestor, the
                        engine's{" "}
                        <InlineCode>buildRepeatContexts()</InlineCode> walks
                        backward through edges to find it and stores{" "}
                        <InlineCode>
                            has_sustained_ancestor = true
                        </InlineCode>{" "}
                        and{" "}
                        <InlineCode>
                            sustain_duration_seconds
                        </InlineCode>{" "}
                        in the RepeatNode's context.
                    </p>
                    <p>
                        Each repeat fire then calls{" "}
                        <InlineCode>retriggerFromSource()</InlineCode>, which
                        re-runs <InlineCode>trigger()</InlineCode> from the
                        metric source node with{" "}
                        <InlineCode>
                            extra_sustain_seconds = interval × repeatCount
                        </InlineCode>
                        . This means the SustainedNode re-checks an expanding
                        time window. If the condition breaks, the repeat stops.
                    </p>
                    <CodeBlock>{`// NodeConfigEngine::fireTimer() — repeat with sustained ancestor
$hasSustainedAncestor = $state['has_sustained_ancestor'] ?? false;
$accumulatedExtra = $result->state['accumulated_extra_seconds'] ?? 0;

if ($hasSustainedAncestor && $result->shouldPropagate && $accumulatedExtra > 0) {
    return $this->retriggerFromSource($config, $nodeMap, $edges, $accumulatedExtra, $context);
}

// retriggerFromSource() passes extra_sustain_seconds into trigger()
$extraState = array_merge($context, [
    'extra_sustain_seconds' => $accumulatedExtraSeconds,
]);
return $this->trigger($config, $sourceNodeId, $metricValue, $extraState);`}</CodeBlock>
                </SubSection>

                <SubSection title="State Persistence">
                    <p>
                        Each node's state is persisted in the{" "}
                        <InlineCode>node_config_states</InlineCode> table via{" "}
                        <InlineCode>NodeConfigState</InlineCode>. This includes:
                    </p>
                    <ul className="list-disc list-inside ml-2 space-y-1">
                        <li>
                            <InlineCode>context</InlineCode> — JSON blob with
                            node-specific state (timer_pending, already_fired,
                            repeat_count, accumulated_seconds, etc.)
                        </li>
                        <li>
                            <InlineCode>output_value</InlineCode> — the last
                            propagated value (used to pass data between nodes
                            across evaluation cycles).
                        </li>
                    </ul>
                    <p>
                        State is read at the start of each{" "}
                        <InlineCode>trigger()</InlineCode> call and written
                        after each node evaluation. This enables SustainedNode
                        to track{" "}
                        <InlineCode>timer_pending</InlineCode> across polls and
                        RepeatNode to track{" "}
                        <InlineCode>repeat_count</InlineCode> across timer
                        fires.
                    </p>
                </SubSection>

                <SubSection title="Key Files">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border border-border/40 rounded-lg overflow-hidden">
                            <thead className="bg-muted/30">
                                <tr>
                                    <th className="text-left px-3 py-2 font-medium text-foreground">
                                        File
                                    </th>
                                    <th className="text-left px-3 py-2 font-medium text-foreground">
                                        Role
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                <tr>
                                    <td className="px-3 py-1.5 font-mono text-xs">
                                        NodeConfigEngine.php
                                    </td>
                                    <td className="px-3 py-1.5">
                                        Core evaluation engine — trigger,
                                        fireTimer, retriggerFromSource
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-3 py-1.5 font-mono text-xs">
                                        SustainedNode.php
                                    </td>
                                    <td className="px-3 py-1.5">
                                        Timer-based sustain check with
                                        historical DB validation
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-3 py-1.5 font-mono text-xs">
                                        RepeatNode.php
                                    </td>
                                    <td className="px-3 py-1.5">
                                        Interval-based repeat with sustained
                                        ancestor integration
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-3 py-1.5 font-mono text-xs">
                                        CheckAfterNode.php
                                    </td>
                                    <td className="px-3 py-1.5">
                                        Delay node — schedules timer, cancels on
                                        false input
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-3 py-1.5 font-mono text-xs">
                                        FireNodeTimer.php
                                    </td>
                                    <td className="px-3 py-1.5">
                                        Delayed queue job — fires timers and
                                        chains next iteration
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-3 py-1.5 font-mono text-xs">
                                        MonitorServer.php
                                    </td>
                                    <td className="px-3 py-1.5">
                                        Per-server job — resolves config,
                                        evaluates all metrics
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-3 py-1.5 font-mono text-xs">
                                        NodeConfigState.php
                                    </td>
                                    <td className="px-3 py-1.5">
                                        Persists per-node evaluation state
                                        across cycles
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-3 py-1.5 font-mono text-xs">
                                        NodeConfigCache.php
                                    </td>
                                    <td className="px-3 py-1.5">
                                        Resolves config with server &gt; client
                                        &gt; global cascade
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