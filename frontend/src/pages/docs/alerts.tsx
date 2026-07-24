import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import { NodeConfigEditor } from "@/components/node-config/NodeConfigEditor";
import type { NodeConfigGraph } from "@/types/node-config";
import {
    Section,
    SubSection,
    CodeBlock,
    InlineCode,
    Callout,
} from "@/components/docs/Section";
import IndexHeader from "@/components/IndexHeader";

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
                operator: "greater_than",
                threshold: 85,
                min: 0,
                max: 0,
            },
        },
        {
            id: "sustained_10",
            type: "sustained",
            position: { x: 600, y: 60 },
            settings: { label: "Sustained 10s", duration: "00:00:00:00:10" },
        },
        {
            id: "sustained_20",
            type: "sustained",
            position: { x: 600, y: 210 },
            settings: { label: "Sustained 20s", duration: "00:00:00:00:20" },
        },
        {
            id: "sustained_30",
            type: "sustained",
            position: { x: 600, y: 360 },
            settings: { label: "Sustained 30s", duration: "00:00:00:00:30" },
        },
        {
            id: "email_10",
            type: "notification",
            position: { x: 860, y: 10 },
            settings: {
                label: "Email 10s",
                channel: "email",
                subject:
                    "[{server.client.name}] {server.name} - {metricName} Alert (10s)",
                message:
                    "[{server.client.name}] {server.name}'s {metricName} has been above 85% for {sustainValue}! (sent {runtime.timestamp})",
            },
        },
        {
            id: "email_20",
            type: "notification",
            position: { x: 860, y: 210 },
            settings: {
                label: "Email 20s",
                channel: "email",
                subject:
                    "[{server.client.name}] {server.name} - {metricName} Alert (20s)",
                message:
                    "[{server.client.name}] {server.name}'s {metricName} has been above 85% for {sustainValue}! (sent {runtime.timestamp})",
            },
        },
        {
            id: "discord_30",
            type: "notification",
            position: { x: 860, y: 410 },
            settings: {
                label: "Discord 30s",
                channel: "discord",
                message:
                    ":rotating_light: [{server.client.name}] {server.name}'s {metricName} has been above 85% for {sustainValue}! Repeating every 10s. (sent {runtime.timestamp})",
            },
        },
        {
            id: "repeat_10",
            type: "repeat",
            position: { x: 1120, y: 410 },
            settings: { label: "Repeat 10s", interval: "00:00:00:00:10" },
        },
        {
            id: "metric_status",
            type: "metric",
            position: { x: 100, y: 640 },
            settings: { label: "Server Status", metric_type: "server_status" },
        },
        {
            id: "email_offline",
            type: "notification",
            position: { x: 340, y: 640 },
            settings: {
                label: "Email Offline",
                channel: "email",
                subject: "[{server.client.name}] {server.name} - Offline Alert",
                message:
                    "[{server.client.name}] {server.name} is offline! (sent {runtime.timestamp})",
            },
        },
        {
            id: "check_after_10m",
            type: "check_after",
            position: { x: 340, y: 840 },
            settings: { label: "Check After 10s", duration: "00:00:00:00:10" },
        },
        {
            id: "discord_offline",
            type: "notification",
            position: { x: 600, y: 840 },
            settings: {
                label: "Discord Offline",
                channel: "discord",
                message:
                    ":rotating_light: [{server.client.name}] {server.name} is still offline! (for {runtime.offlineDuration}) (sent {runtime.timestamp})",
            },
        },
        {
            id: "repeat_5m",
            type: "repeat",
            position: { x: 860, y: 840 },
            settings: { label: "Repeat 5s", interval: "00:00:00:00:05" },
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
            id: "e_85_s20",
            source: "compare_85",
            target: "sustained_20",
            sourceHandle: "output",
            targetHandle: "input",
        },
        {
            id: "e_85_s30",
            source: "compare_85",
            target: "sustained_30",
            sourceHandle: "output",
            targetHandle: "input",
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
            id: "e_discord_repeat_metrics",
            source: "discord_30",
            target: "repeat_10",
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
            id: "e_discord_repeat",
            source: "discord_offline",
            target: "repeat_5m",
            sourceHandle: "output",
            targetHandle: "input",
        },
    ],
};

// ── Page ──────────────────────────────────────────────────────────

export default function DocsAlerts() {
    const navigate = useNavigate();

    return (
        <PageLayout>
            <IndexHeader
                icon={Bell}
                title="Alerts"
                description="Node-based alerting system — configuration, evaluation, and scheduling."
                onBackClick={() => navigate("/docs")}
            />

            <main className="py-6 w-full flex-1">
                <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-10">
                    <Section title="User Use Case">
                        <p>
                            The alerting system lets you define alerts as visual
                            node graphs. Each graph is a pipeline:{" "}
                            <strong>metrics</strong> flow through{" "}
                            <strong>conditions</strong> and{" "}
                            <strong>time gates</strong> and eventually trigger{" "}
                            <strong>notifications</strong> (email or Discord).
                        </p>
                        <p>
                            You configure alerts at{" "}
                            <InlineCode>/settings/alerts</InlineCode> using a
                            drag-and-drop editor. The default configuration
                            monitors CPU, memory, disk, and network usage across
                            all servers.
                        </p>
                    </Section>

                    <Section title="Default Alert Graph">
                        <p className="mb-4">
                            This is the default alert pipeline seeded into the
                            system. Each branch fires at a different sustain
                            duration.
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

                    <Section title="Node Types">
                        <SubSection title="Metric Node (blue)">
                            <p>
                                The entry point of every alert pipeline. Reads a
                                metric value from the server — CPU usage,
                                memory, disk, network, or server status
                                (online/offline). Each metric type has its own
                                source node.
                            </p>
                            <p>
                                The system polls every minute via the{" "}
                                <InlineCode>system:monitor</InlineCode>{" "}
                                scheduled command, which dispatches a{" "}
                                <InlineCode>MonitorServer</InlineCode> job per
                                server. That job resolves the latest metric
                                sample and calls{" "}
                                <InlineCode>
                                    NodeConfigEngine::trigger()
                                </InlineCode>{" "}
                                with the metric source node.
                            </p>
                        </SubSection>

                        <SubSection title="Condition Node (amber)">
                            <p>
                                Evaluates a comparison against a threshold.
                                Supports <InlineCode>greater_than</InlineCode>,{" "}
                                <InlineCode>less_than</InlineCode>,{" "}
                                <InlineCode>equal</InlineCode>, and{" "}
                                <InlineCode>between</InlineCode> operators.
                            </p>
                            <p>
                                Outputs a boolean. Multiple metrics can feed
                                into the same condition (OR logic — if any
                                metric exceeds the threshold, the condition is
                                true).
                            </p>
                        </SubSection>

                        <SubSection title="Sustained Node (green)">
                            <p>
                                Ensures a condition has been continuously true
                                for a minimum duration before propagating. This
                                prevents alerts on brief spikes.
                            </p>
                            <p>
                                Works via{" "}
                                <strong>timer-based scheduling</strong>: when
                                the condition first becomes true, the
                                SustainedNode dispatches a delayed{" "}
                                <InlineCode>FireNodeTimer</InlineCode> job. On
                                subsequent minute polls, it skips if a timer is
                                already pending. When the timer fires, it
                                re-checks the historical condition against the
                                database.
                            </p>
                            <p>
                                <strong>Settings:</strong>
                            </p>
                            <ul className="list-disc list-inside ml-2 space-y-1">
                                <li>
                                    <InlineCode>duration</InlineCode> — the
                                    sustain window (format:{" "}
                                    <InlineCode>MM:DD:HH:MM:SS</InlineCode>).
                                </li>
                                <li>
                                    <InlineCode>min_match_percent</InlineCode> —
                                    minimum percentage of samples that must
                                    violate the threshold within the window
                                    (default: 100%). Set to 80 to tolerate 20%
                                    of samples dipping below the threshold.
                                </li>
                            </ul>
                        </SubSection>

                        <SubSection title="Repeat Node (red)">
                            <p>
                                After initial trigger, repeatedly fires at a
                                configurable interval to send periodic reminder
                                notifications. Uses the same{" "}
                                <InlineCode>FireNodeTimer</InlineCode>{" "}
                                delayed-job mechanism as SustainedNode.
                            </p>
                            <p>
                                Cancels automatically when the upstream
                                condition becomes false.
                            </p>
                            <p>
                                <strong>Settings:</strong>
                            </p>
                            <ul className="list-disc list-inside ml-2 space-y-1">
                                <li>
                                    <InlineCode>interval</InlineCode> — time
                                    between repeats.
                                </li>
                                <li>
                                    <InlineCode>max_repeats</InlineCode> — cap
                                    on repeats (0 = infinite).
                                </li>
                            </ul>
                        </SubSection>

                        <SubSection title="Check After Node (delay)">
                            <p>
                                Delays propagation for a fixed duration. If the
                                input goes false before the timer fires, the
                                pending timer is discarded. Useful for
                                debouncing — e.g., waiting 10 seconds before
                                sending a "server offline" Discord alert to
                                avoid flapping.
                            </p>
                        </SubSection>

                        <SubSection title="Notification Node (action)">
                            <p>
                                Terminal node that sends an email or Discord
                                message. Supports template variables:{" "}
                                <InlineCode>{`{server.name}`}</InlineCode>,{" "}
                                <InlineCode>{`{server.client.name}`}</InlineCode>
                                , <InlineCode>{`{metricName}`}</InlineCode>,{" "}
                                <InlineCode>{`{sustainValue}`}</InlineCode>,{" "}
                                <InlineCode>{`{runtime.timestamp}`}</InlineCode>
                                .
                            </p>
                        </SubSection>
                    </Section>

                    <Section title="Alert Flow Walkthrough">
                        <p>
                            Here is what happens when CPU usage hits 92% on a
                            server:
                        </p>
                        <ol className="list-decimal list-inside ml-2 space-y-2">
                            <li>
                                <strong>t=0 (poll):</strong>{" "}
                                <InlineCode>system:monitor</InlineCode> runs.
                                <InlineCode>MonitorServer</InlineCode> fetches
                                the latest CPU sample (92.5) and calls{" "}
                                <InlineCode>engine::trigger()</InlineCode>.
                            </li>
                            <li>
                                <strong>Condition node:</strong> 92.5 &gt; 85 →
                                true.
                            </li>
                            <li>
                                <strong>Sustained nodes (fan-out):</strong> All
                                three receive true in the same topological pass.
                                Each dispatches a{" "}
                                <InlineCode>FireNodeTimer</InlineCode> with
                                their respective delay: 10s, 20s, 30s.
                            </li>
                            <li>
                                <strong>t=10s:</strong> 10s timer fires →
                                re-checks historical condition → still true →{" "}
                                <InlineCode>email_10</InlineCode> fires.
                            </li>
                            <li>
                                <strong>t=20s:</strong> 20s timer fires →{" "}
                                <InlineCode>email_20</InlineCode> fires.
                            </li>
                            <li>
                                <strong>t=30s:</strong> 30s timer fires →{" "}
                                <InlineCode>discord_30</InlineCode> fires →{" "}
                                <InlineCode>repeat_10</InlineCode> starts.
                            </li>
                            <li>
                                <strong>t=40s, 50s, 60s…:</strong> Repeat fires
                                every 10s. Each time,{" "}
                                <InlineCode>retriggerFromSource()</InlineCode>{" "}
                                re-evaluates the full graph with an expanding
                                sustain window (40s, 50s, 60s…). If CPU drops
                                below 85%, the historical check fails and the
                                repeat stops.
                            </li>
                        </ol>
                    </Section>

                    <Section title="Config Resolution">
                        <p>
                            Alerts can be scoped at three levels. When
                            evaluating, the system picks the most specific
                            config:
                        </p>
                        <ol className="list-decimal list-inside ml-2 space-y-1">
                            <li>
                                <strong>Server-scoped</strong> — applies to one
                                specific server.
                            </li>
                            <li>
                                <strong>Client-scoped</strong> — applies to all
                                servers in a client.
                            </li>
                            <li>
                                <strong>Global</strong> — fallback for all
                                servers.
                            </li>
                        </ol>
                        <Callout>
                            <strong>Tip:</strong> Create a global config with
                            default thresholds, then override per-server for
                            machines that need tighter or looser alerts.
                        </Callout>
                    </Section>

                    {/* ═══════════════ CODE SIDE ═══════════════ */}

                    <Section title="Code Architecture">
                        <SubSection title="Entry Points">
                            <p>
                                The scheduled command{" "}
                                <InlineCode>system:monitor</InlineCode> (defined
                                in <InlineCode>routes/console.php</InlineCode>)
                                runs every minute and dispatches{" "}
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
                                <InlineCode>MonitorServer</InlineCode> resolves
                                the config via{" "}
                                <InlineCode>
                                    NodeConfigCache::resolveForServer()
                                </InlineCode>
                                , then calls{" "}
                                <InlineCode>engine::trigger()</InlineCode> for
                                each metric (server_status, cpu, memory, disk).
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
                                <li>
                                    Validates the graph (no cycles, valid
                                    edges).
                                </li>
                                <li>Topologically sorts nodes.</li>
                                <li>
                                    Builds condition and repeat contexts (maps
                                    SustainedNode → upstream ConditionNode
                                    settings, RepeatNode → SustainedNode
                                    ancestor info).
                                </li>
                                <li>
                                    Evaluates each node in order, passing
                                    upstream outputs as inputs.
                                </li>
                                <li>
                                    Collects timers (delayed callbacks) and
                                    actions (notifications) from results.
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
                                <InlineCode>
                                    NodeTimer(delayMs, context)
                                </InlineCode>
                                .
                            </p>
                            <p>
                                The caller (
                                <InlineCode>MonitorServer</InlineCode> or{" "}
                                <InlineCode>EvaluateNodeConfig</InlineCode>)
                                dispatches{" "}
                                <InlineCode>FireNodeTimer</InlineCode> as a
                                delayed Laravel queue job:
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
                                <InlineCode>engine::fireTimer()</InlineCode>,
                                which re-evaluates the node with{" "}
                                <InlineCode>timer_fire = true</InlineCode> in
                                state. If the node propagates, downstream nodes
                                are processed. For RepeatNodes with a Sustained
                                ancestor, it calls{" "}
                                <InlineCode>retriggerFromSource()</InlineCode>{" "}
                                instead, which re-evaluates the entire graph
                                from the metric source with accumulated sustain
                                time.
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
                                <InlineCode>timer_pending</InlineCode> flag
                                (persisted in{" "}
                                <InlineCode>NodeConfigState</InlineCode>) to
                                track whether a timer has been dispatched:
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
                                When the SustainedNode's timer fires, it queries
                                the <InlineCode>metric_samples</InlineCode>{" "}
                                table for all samples within the sustain window
                                and checks what percentage violate the
                                threshold:
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
                                When a RepeatNode has a SustainedNode ancestor,
                                the engine's{" "}
                                <InlineCode>buildRepeatContexts()</InlineCode>{" "}
                                walks backward through edges to find it and
                                stores{" "}
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
                                <InlineCode>retriggerFromSource()</InlineCode>,
                                which re-runs <InlineCode>trigger()</InlineCode>{" "}
                                from the metric source node with{" "}
                                <InlineCode>
                                    extra_sustain_seconds = interval ×
                                    repeatCount
                                </InlineCode>
                                . This means the SustainedNode re-checks an
                                expanding time window. If the condition breaks,
                                the repeat stops.
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
                                <InlineCode>node_config_states</InlineCode>{" "}
                                table via{" "}
                                <InlineCode>NodeConfigState</InlineCode>. This
                                includes:
                            </p>
                            <ul className="list-disc list-inside ml-2 space-y-1">
                                <li>
                                    <InlineCode>context</InlineCode> — JSON blob
                                    with node-specific state (timer_pending,
                                    already_fired, repeat_count,
                                    accumulated_seconds, etc.)
                                </li>
                                <li>
                                    <InlineCode>output_value</InlineCode> — the
                                    last propagated value (used to pass data
                                    between nodes across evaluation cycles).
                                </li>
                            </ul>
                            <p>
                                State is read at the start of each{" "}
                                <InlineCode>trigger()</InlineCode> call and
                                written after each node evaluation. This enables
                                SustainedNode to track{" "}
                                <InlineCode>timer_pending</InlineCode> across
                                polls and RepeatNode to track{" "}
                                <InlineCode>repeat_count</InlineCode> across
                                timer fires.
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
                                                Core evaluation engine —
                                                trigger, fireTimer,
                                                retriggerFromSource
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
                                                Interval-based repeat with
                                                sustained ancestor integration
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="px-3 py-1.5 font-mono text-xs">
                                                CheckAfterNode.php
                                            </td>
                                            <td className="px-3 py-1.5">
                                                Delay node — schedules timer,
                                                cancels on false input
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="px-3 py-1.5 font-mono text-xs">
                                                FireNodeTimer.php
                                            </td>
                                            <td className="px-3 py-1.5">
                                                Delayed queue job — fires timers
                                                and chains next iteration
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="px-3 py-1.5 font-mono text-xs">
                                                MonitorServer.php
                                            </td>
                                            <td className="px-3 py-1.5">
                                                Per-server job — resolves
                                                config, evaluates all metrics
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="px-3 py-1.5 font-mono text-xs">
                                                NodeConfigState.php
                                            </td>
                                            <td className="px-3 py-1.5">
                                                Persists per-node evaluation
                                                state across cycles
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="px-3 py-1.5 font-mono text-xs">
                                                NodeConfigCache.php
                                            </td>
                                            <td className="px-3 py-1.5">
                                                Resolves config with server &gt;
                                                client &gt; global cascade
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </SubSection>
                    </Section>

                    <Section title="Duration Format">
                        <p>
                            All time-based settings use the format{" "}
                            <InlineCode>MM:DD:HH:MM:SS</InlineCode> (months,
                            days, hours, minutes, seconds). Examples:
                        </p>
                        <CodeBlock>{`00:00:00:00:10  →  10 seconds
00:00:00:00:30  →  30 seconds
00:00:00:10:00  →  10 minutes
00:00:01:00:00  →  1 hour
00:00:10:00:00  →  10 days`}</CodeBlock>
                    </Section>
                </div>
            </main>
        </PageLayout>
    );
}
