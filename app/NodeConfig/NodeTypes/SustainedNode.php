<?php

namespace App\NodeConfig\NodeTypes;

use App\Models\Agent;
use App\Models\MetricSample;
use App\Models\Port;
use App\Models\Server;
use App\Models\ServerUpdate;
use App\Models\Setting;
use Illuminate\Support\Facades\Log;

class SustainedNode extends BaseNode
{
    public function getType(): string
    {
        return 'sustained';
    }

    public function getCategory(): string
    {
        return 'time';
    }

    public function getLabel(): string
    {
        return 'Sustained';
    }

    public function getSettingDefinitions(): array
    {
        return [
            ['key' => 'duration', 'label' => 'Duration (ms)', 'type' => 'string', 'required' => true, 'default' => '300000'],
            ['key' => 'min_match_percent', 'label' => 'Min Match %', 'type' => 'number', 'default' => 100, 'description' => 'Minimum % of samples that must violate the threshold within the sustain window'],
            ['key' => 'repeat_interval', 'label' => 'Repeat Interval (ms)', 'type' => 'string', 'default' => ''],
            ['key' => 'repeat_max_repeats', 'label' => 'Max Repeats (-1 = infinite)', 'type' => 'number', 'default' => -1],
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Entry point
    // ─────────────────────────────────────────────────────────────────────────

    public function evaluate(array $inputValues, array $settings, array $state): NodeResult
    {
        $cfg = $this->parseConfig($settings, $state);

        return ($state['timer_fire'] ?? false)
            ? $this->onTimerFire($cfg, $state)
            : $this->onHeartbeat($cfg, $state, $inputValues[0] ?? null);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Heartbeat path  (no DB query — driven purely by live ConditionNode input)
    //
    // The $input is the output of the upstream ConditionNode (true/false/null).
    // It tells us whether the metric is currently crossing the threshold.
    // It "jumpstarts" the sustain window; the DB verifies it at timer-fire time.
    // ─────────────────────────────────────────────────────────────────────────

    private function onHeartbeat(array $cfg, array $state, mixed $input): NodeResult
    {
        $phase = $state['phase'] ?? 'idle';
        $conditionMet = $input === true;

        return match ($phase) {
            // Already firing: stay until condition clears (recovery)
            'firing' => $conditionMet
                ? NodeResult::noPropagate(null, $state)
                : NodeResult::cancelTimers($this->idleState()),

            // Timer is in flight: wait — if condition cleared while pending, cancel timer & return to idle
            'pending' => $conditionMet
                ? NodeResult::noPropagate(null, $state)
                : NodeResult::cancelTimers($this->idleState()),

            // Idle: start the sustain window on first truthy input
            default => $conditionMet
                ? NodeResult::noPropagate(
                    new NodeTimer($cfg['duration_ms'], ['sustain_fire' => true]),
                    ['phase' => 'pending', 'repeat_count' => 0],
                )
                : NodeResult::propagate(false, $this->idleState()),
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Timer-fire path  (DB query — verifies the condition was truly sustained)
    //
    // Two sub-cases arrive here:
    //   sustain fire  — initial window elapsed, check whether condition held
    //   repeat fire   — subsequent repeat interval elapsed, re-check and re-alert
    // ─────────────────────────────────────────────────────────────────────────

    private function onTimerFire(array $cfg, array $state): NodeResult
    {
        $isRepeat = $state['repeat_fire'] ?? false;
        $repeatCount = (int) ($state['repeat_count'] ?? 0) + ($isRepeat ? 1 : 0);

        // DB re-verification: was the condition actually sustained?
        if (! $this->checkHistoricalCondition($cfg)) {
            return NodeResult::cancelTimers($this->idleState());
        }

        // Condition confirmed — fire notification and manage repeat cycle
        $firingState = ['phase' => 'firing', 'repeat_count' => $repeatCount];

        if ($cfg['has_repeat'] && ($cfg['max_repeats'] <= 0 || $repeatCount < $cfg['max_repeats'])) {
            return NodeResult::withTimer(
                true,
                new NodeTimer($cfg['repeat_interval_ms'], ['repeat_fire' => true]),
                $firingState,
            );
        }

        // After a one-shot fire: propagate the alert, then return to idle so the
        // next heartbeat can start a fresh pending window if conditions still hold.
        return NodeResult::propagate(true, $this->idleState());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private function idleState(): array
    {
        return ['phase' => 'idle', 'repeat_count' => 0];
    }

    private function parseConfig(array $settings, array $state): array
    {
        $durationMs = static::parseDurationToMs($settings['duration'] ?? '300000');
        $durationMs += (int) ($state['extra_sustain_ms'] ?? 0);

        $repeatIntervalMs = static::parseDurationToMs($settings['repeat_interval'] ?? '0');

        return [
            'duration_ms' => $durationMs,
            'min_match_percent' => (is_numeric($settings['min_match_percent'] ?? null) && (float) $settings['min_match_percent'] > 0) ? (float) $settings['min_match_percent'] : 100,
            'repeat_interval_ms' => $repeatIntervalMs,
            'max_repeats' => (int) ($settings['repeat_max_repeats'] ?? -1),
            'has_repeat' => $repeatIntervalMs > 0,
            'server_id' => $state['server_id'] ?? null,
            'metric_type' => $state['metric_type'] ?? null,
            'threshold' => $state['threshold'] ?? null,
            'operator' => $state['operator'] ?? 'greater_than',
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DB condition checks
    // ─────────────────────────────────────────────────────────────────────────

    private function checkHistoricalCondition(array $cfg): bool
    {
        $serverId = $cfg['server_id'];
        $metricType = $cfg['metric_type'];

        if (! $serverId || ! $metricType) {
            return false;
        }

        if ($metricType === 'server_status') {
            return $this->checkServerStatusCondition($serverId, $cfg['duration_ms']);
        }

        if ($metricType === 'ports_ping') {
            return $this->checkPortTimingCondition($serverId, $cfg['threshold'], $cfg['operator']);
        }

        if ($cfg['threshold'] === null) {
            return false;
        }

        return $this->checkMetricCondition(
            $serverId,
            $metricType,
            (float) $cfg['threshold'],
            $cfg['operator'],
            $cfg['duration_ms'],
            $cfg['min_match_percent'],
        );
    }

    private function checkServerStatusCondition(int $serverId, int $requiredMs): bool
    {
        $agent = Server::find($serverId)?->agent ?? Agent::where('server_id', $serverId)->where('status', 'active')->first();

        if (! $agent || ! $agent->last_seen_at) {
            return false;
        }

        $rawOffline = (int) Setting::get('offline_threshold', '15');
        $offlineSec = $rawOffline >= 1000 ? intdiv($rawOffline, 1000) : ($rawOffline ?: 15);

        return $agent->last_seen_at->lt(now()->subSeconds($offlineSec)->subMilliseconds($requiredMs));
    }

    private function checkPortTimingCondition(int $serverId, ?float $threshold, string $operator): bool
    {
        if ($threshold === null) {
            return false;
        }

        $agent = Server::find($serverId)?->agent ?? Agent::where('server_id', $serverId)->where('status', 'active')->first();
        if (! $agent) {
            return false;
        }

        $sqlOp = $this->toSqlOperator($operator);

        return Port::where('agent_id', $agent->id)
            ->where('ping_status', 'online')
            ->whereNotNull('ping_time')
            ->where('ping_time', $sqlOp, $threshold)
            ->exists();
    }

    private function checkMetricCondition(
        int $serverId,
        string $metricType,
        float $threshold,
        string $operator,
        int $requiredMs,
        float $minMatchPercent,
    ): bool {
        $agent = Server::find($serverId)?->agent ?? Agent::where('server_id', $serverId)->where('status', 'active')->first();
        if (! $agent) {
            return false;
        }

        $metricNameMap = [
            'cpu_usage' => 'load1',
            'memory_usage' => 'percent',
            'disk_usage' => 'percent',
            'network_usage' => 'rx_bytes',
        ];

        $metricName = $metricNameMap[$metricType] ?? $metricType;
        $metricTypeForQuery = explode('_', $metricType, 2)[0];
        $since = now()->subMilliseconds($requiredMs + 2000);
        $sqlOperator = $this->toSqlOperator($operator);

        // Single aggregated query instead of two separate count() calls
        $row = MetricSample::whereHas('batch', fn ($q) => $q->where('agent_id', $agent->id))
            ->where('recorded_at', '>=', $since)
            ->where('metric_type', $metricTypeForQuery)
            ->where('metric_name', $metricName)
            ->selectRaw(
                'COUNT(*) as total, SUM(CASE WHEN value '.$sqlOperator.' ? THEN 1 ELSE 0 END) as violating',
                [$threshold],
            )
            ->first();

        if (! $row || (int) $row->total === 0) {
            // Fallback to ServerUpdate when MetricSample window is empty (e.g. aggregated heartbeat lag)
            $colMap = ['cpu_usage' => 'cpu_usage', 'memory_usage' => 'memory_usage', 'disk_usage' => 'storage'];
            $col = $colMap[$metricType] ?? null;
            if ($col) {
                $latest = ServerUpdate::where('server_id', $serverId)
                    ->orderByDesc('created_at')
                    ->first();
                if ($latest && isset($latest->$col)) {
                    $val = (float) $latest->$col;
                    $holds = match ($operator) {
                        'greater_than' => $val > $threshold,
                        'greater_than_equal' => $val >= $threshold,
                        'less_than' => $val < $threshold,
                        'less_than_equal' => $val <= $threshold,
                        'equal' => $val == $threshold,
                        'not_equal' => $val != $threshold,
                        default => false,
                    };
                    if ($holds) {
                        Log::info('[sustained] checkMetricCondition — fallback ServerUpdate holds', ['server_id' => $serverId, 'metric_type' => $metricType, 'value' => $val]);

                        return true;
                    }
                }
            }
            Log::info('[sustained] checkMetricCondition — no samples in window', [
                'server_id' => $serverId,
                'metric_type' => $metricType,
                'since' => $since->toDateTimeString(),
                'required_ms' => $requiredMs,
            ]);

            return false;
        }

        $matchPercent = ((int) $row->violating / (int) $row->total) * 100;
        $passes = $matchPercent >= $minMatchPercent;
        if (! $passes) {
            Log::info('[sustained] checkMetricCondition — below min_match_percent', [
                'server_id' => $serverId,
                'metric_type' => $metricType,
                'total' => (int) $row->total,
                'violating' => (int) $row->violating,
                'match_percent' => $matchPercent,
                'min_percent' => $minMatchPercent,
            ]);
        }

        return $passes;
    }

    private function toSqlOperator(string $operator): string
    {
        return match ($operator) {
            'greater_than_equal' => '>=',
            'less_than' => '<',
            'less_than_equal' => '<=',
            'equal' => '=',
            default => '>',   // greater_than (and fallback)
        };
    }
}
