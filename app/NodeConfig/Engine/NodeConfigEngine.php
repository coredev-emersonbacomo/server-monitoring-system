<?php

namespace App\NodeConfig\Engine;

use App\Models\Agent;
use App\Models\MetricSample;
use App\Models\Port;
use App\Models\Setting;
use App\NodeConfig\Models\NodeConfig;
use App\NodeConfig\Models\NodeConfigState;
use App\NodeConfig\NodeTypes\BaseNode;
use App\NodeConfig\NodeTypes\NodeResult;
use App\NodeConfig\Validation\NodeConfigValidator;
use Carbon\Carbon;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\Log;

class NodeConfigEngine
{
    private NodeRegistry $registry;

    private NodeConfigValidator $validator;

    private const METRIC_NAMES = [
        'cpu_usage' => 'CPU Usage',
        'memory_usage' => 'Memory Usage',
        'disk_usage' => 'Disk Usage',
        'network_usage' => 'Network Usage',
        'server_status' => 'Server Status',
        'heartbeat_age' => 'Heartbeat Age',
        'ports_ping' => 'Ports Ping',
    ];

    public function __construct(NodeRegistry $registry)
    {
        $this->registry = $registry;
        $this->validator = new NodeConfigValidator;
    }

    public function getValidator(): NodeConfigValidator
    {
        return $this->validator;
    }

    /**
     * Trigger evaluation from a metric node. Matches compiled branches by metric_node_id.
     */
    public function trigger(NodeConfig $config, string $sourceNodeId, mixed $value, array $extraState = [], ?int $serverId = null): array
    {
        $compiledRules = $config->compiled_config ?? $this->compileConfig($config);
        $branches = $compiledRules['branches'] ?? [];

        $matchingBranches = array_values(array_filter(
            $branches,
            fn (array $branch) => $branch['metric_node_id'] === $sourceNodeId,
        ));

        if (empty($matchingBranches)) {
            return ['success' => true, 'outputs' => [], 'timers' => [], 'actions' => []];
        }

        $allTimers = [];
        $allActions = [];
        $allOutputs = [];

        foreach ($matchingBranches as $branch) {
            if (! $this->matchesSourceHandle($branch, $value)) {
                continue;
            }

            $result = $this->evaluateBranch($config, $branch, $sourceNodeId, $value, $extraState, $serverId);
            $allTimers = array_merge($allTimers, $result['timers']);
            $allActions = array_merge($allActions, $result['actions']);
            $allOutputs = array_merge($allOutputs, $result['outputs']);
        }

        return [
            'success' => true,
            'outputs' => $allOutputs,
            'timers' => $allTimers,
            'actions' => $allActions,
        ];
    }

    /**
     * Check if a branch's source handle matches the incoming value (for multi-output metrics).
     */
    private function matchesSourceHandle(array $branch, mixed $value): bool
    {
        $handle = $branch['metric_source_handle'] ?? 'output';
        if ($handle === 'output') {
            return true;
        }
        if ($value === $handle) {
            return true;
        }

        // ports_ping 'timing' socket carries a numeric ping time (ms)
        return is_numeric($value) && $handle === 'timing';
    }

    /**
     * Evaluate one metric branch: condition (once) → each sub-branch (timing → action → post_action).
     */
    private function evaluateBranch(
        NodeConfig $config,
        array $branch,
        string $metricNodeId,
        mixed $value,
        array $extraState,
        ?int $serverId,
    ): array {
        $timers = [];
        $actions = [];
        $outputs = [];

        $nodeMap = $this->buildNodeMap($config->getParsedConfig()['nodes'] ?? []);

        // ── Evaluate metric node ──────────────────────────────
        $metricHandler = $this->registry->get('metric');
        $metricSettings = $nodeMap[$metricNodeId]['settings'] ?? [];
        $metricState = array_merge(['metric_value' => $value], $extraState);
        $metricResult = $metricHandler->evaluate([], $metricSettings, $metricState);
        $this->saveState($config->id, $serverId, $metricNodeId, $metricResult);

        if (! empty($metricResult->outputs)) {
            $outputs[$metricNodeId] = $metricResult->outputs;
        } elseif ($metricResult->shouldPropagate) {
            $outputs[$metricNodeId] = ['output' => $metricResult->value];
        }

        // ── Evaluate condition node (shared across sub-branches) ──
        $conditionPassed = true;
        if ($branch['condition'] && $branch['condition_node_id']) {
            $conditionNode = $nodeMap[$branch['condition_node_id']] ?? null;
            $conditionType = $branch['condition']['type'] ?? 'condition';
            $conditionHandler = $this->registry->get($conditionType);
            $conditionSettings = $conditionNode['settings'] ?? $branch['condition'];

            // Resolve any template (parameter) inputs wired into the condition's
            // threshold/min/max sockets. These override the static settings with a
            // value injected via extra_state at trigger time, and the settled values
            // are written back onto $branch['condition'] so downstream timing nodes
            // (e.g. sustained) read the parameter-supplied threshold.
            $resolvedCondition = $this->resolveTemplateRefs(
                $conditionSettings,
                $branch['condition']['template_refs'] ?? [],
                $extraState,
                $branch['template_strings'] ?? [],
            );
            $conditionSettings = $resolvedCondition;
            foreach (['threshold', 'min', 'max'] as $key) {
                if (array_key_exists($key, $resolvedCondition)) {
                    $branch['condition'][$key] = $resolvedCondition[$key];
                }
            }

            $inputValues = $this->resolveNodeInputs($branch['condition_node_id'], $nodeMap, $conditionType, $branch, $metricResult);

            if ($conditionHandler) {
                $conditionResult = $conditionHandler->evaluate($inputValues, $conditionSettings, $extraState);
                $this->saveState($config->id, $serverId, $branch['condition_node_id'], $conditionResult);

                if ($conditionType === 'severity') {
                    $conditionPassed = $conditionResult->shouldPropagate && $conditionResult->value !== null;
                } else {
                    $conditionPassed = $conditionResult->shouldPropagate && $conditionResult->value === true;
                }

                if (! empty($conditionResult->outputs)) {
                    $outputs[$branch['condition_node_id']] = $conditionResult->outputs;
                } elseif ($conditionResult->shouldPropagate) {
                    $outputs[$branch['condition_node_id']] = ['output' => $conditionResult->value];
                }
            } else {
                Log::warning("[engine] Unknown condition type '{$conditionType}', skipping condition", [
                    'node_id' => $branch['condition_node_id'],
                ]);
            }
        }

        // ── Branch latch: edge-triggered, no implicit repeat ──
        // Once a branch has armed (first boolean check passed), it fires once per
        // incident. While armed it never re-evaluates sub-branches, so a sustained
        // true condition (or a repeat cycle) can't restart an evaluation. The latch
        // releases only when the condition clears AND no evaluation is in flight —
        // a transient false mid-sustain never cancels the running task.
        $branchKey = "{$metricNodeId}:{$branch['metric_source_handle']}";
        $latched = $this->loadBranchLatch($config->id, $serverId, $branchKey);

        if ($latched) {
            if (! $conditionPassed && ! $this->branchHasActiveEvaluation($config, $branch, $serverId)) {
                $this->saveBranchLatch($config->id, $serverId, $branchKey, false);
            }

            return ['timers' => $timers, 'actions' => $actions, 'outputs' => $outputs];
        }

        if ($conditionPassed) {
            $this->saveBranchLatch($config->id, $serverId, $branchKey, true);
        }

        // ── Evaluate each sub-branch ──────────────────────────
        foreach ($branch['sub_branches'] as $subBranch) {
            $result = $this->evaluateSubBranch($config, $subBranch, $branch, $conditionPassed, $value, $extraState, $serverId, $nodeMap);
            $timers = array_merge($timers, $result['timers']);
            $actions = array_merge($actions, $result['actions']);
            $outputs = array_merge($outputs, $result['outputs']);
        }

        return ['timers' => $timers, 'actions' => $actions, 'outputs' => $outputs];
    }

    /**
     * Evaluate one sub-branch: timing → action → post_action.
     */
    private function evaluateSubBranch(
        NodeConfig $config,
        array $subBranch,
        array $branch,
        bool $conditionPassed,
        mixed $value,
        array $extraState,
        ?int $serverId,
        array $nodeMap,
    ): array {
        $timers = [];
        $actions = [];
        $outputs = [];

        // ── Chain sub_branch: route to dedicated chain handler ──────
        if (! empty($subBranch['timing_chain'])) {
            return $this->evaluateChainSubBranch(
                $config, $subBranch, $branch, $conditionPassed, $extraState, $serverId, $nodeMap
            );
        }

        // ── Evaluate timing node ──────────────────────────────
        $timingPropagated = $conditionPassed;
        if ($subBranch['timing'] && $subBranch['timing_node_id']) {
            $timingNode = $nodeMap[$subBranch['timing_node_id']] ?? null;
            $timingType = $subBranch['timing']['type'];
            $timingHandler = $this->registry->get($timingType);
            if (! $timingHandler) {
                return ['timers' => $timers, 'actions' => $actions, 'outputs' => $outputs];
            }

            $timingSettings = $timingNode['settings'] ?? [];

            $persistedStates = $this->loadStates($config->id, $serverId, $branch['metric']);
            $timingState = $persistedStates[$subBranch['timing_node_id']] ?? [];
            $timingState = array_merge($timingState, $extraState);

            if ($timingType === 'sustained' && $branch['condition']) {
                $timingState['threshold'] = $branch['condition']['threshold'];
                $timingState['operator'] = $branch['condition']['operator'];
                $timingState['metric_type'] = $branch['metric'];
                if ($serverId !== null) {
                    $timingState['server_id'] = $serverId;
                }
            }

            $timingInput = $conditionPassed ? [$conditionPassed] : [null];
            $timingResult = $timingHandler->evaluate($timingInput, $timingSettings, $timingState);
            $this->saveState($config->id, $serverId, $subBranch['timing_node_id'], $timingResult, $branch['metric']);

            if ($timingResult->cancelTimers) {
                NodeTaskScheduler::cancelByNode($subBranch['timing_node_id'], $branch['metric'], $serverId);
            }

            if ($timingResult->timer !== null) {
                $timers[] = [
                    'node_config_id' => $config->id,
                    'node_id' => $subBranch['timing_node_id'],
                    'delay_ms' => $timingResult->timer->delayMs,
                    'context' => array_merge($extraState, $timingState, $timingResult->timer->context, [
                        'first_trigger_timestamp' => now()->toISOString(),
                    ]),
                ];
            }

            $timingPropagated = $timingResult->shouldPropagate && $timingResult->value === true;

            if (! empty($timingResult->outputs)) {
                $outputs[$subBranch['timing_node_id']] = $timingResult->outputs;
            } elseif ($timingResult->shouldPropagate) {
                $outputs[$subBranch['timing_node_id']] = ['output' => $timingResult->value];
            }
        }

        // ── Evaluate action node ──────────────────────────────
        if ($timingPropagated && $subBranch['action'] && $subBranch['action_node_id']) {
            $actionHandler = $this->registry->get('notification');
            $actionNode = $nodeMap[$subBranch['action_node_id']] ?? null;
            $actionSettings = $actionNode['settings'] ?? $subBranch['action'];

            $persistedStates = $this->loadStates($config->id, $serverId);
            $actionState = $persistedStates[$subBranch['action_node_id']] ?? [];
            $actionState = array_merge($actionState, $extraState);

            $actionResult = $actionHandler->evaluate([true], $actionSettings, $actionState);
            $this->saveState($config->id, $serverId, $subBranch['action_node_id'], $actionResult);

            if ($actionResult->shouldPropagate && $actionResult->value) {
                $upstreamContext = $this->buildUpstreamContext($branch, $subBranch, $value);
                $upstreamContext = array_merge($upstreamContext, $extraState);
                $actions[] = [
                    'node_id' => $subBranch['action_node_id'],
                    'type' => 'notification',
                    'settings' => $actionSettings,
                    'value' => true,
                    'upstream_context' => $upstreamContext,
                ];

                // ── Evaluate post-action node (repeat/check_after) ──
                if ($subBranch['post_action']) {
                    $postResult = $this->evaluatePostAction(
                        $config,
                        $subBranch['post_action'],
                        $branch,
                        $extraState,
                        $serverId,
                        $nodeMap,
                        $persistedStates,
                    );
                    $timers = array_merge($timers, $postResult['timers']);
                }
            }
        }

        return ['timers' => $timers, 'actions' => $actions, 'outputs' => $outputs];
    }

    /**
     * Evaluate a post-action node (repeat, check_after) after notification fires.
     */
    private function evaluatePostAction(
        NodeConfig $config,
        array $postAction,
        array $branch,
        array $extraState,
        ?int $serverId,
        array $nodeMap,
        array $persistedStates,
    ): array {
        $timers = [];

        $postType = $postAction['type'];
        $postHandler = $this->registry->get($postType);
        if (! $postHandler) {
            return ['timers' => $timers];
        }

        $postSettings = $postAction['settings'] ?? [];
        $postNodeId = $postAction['node_id'];

        $postState = $persistedStates[$postNodeId] ?? [];
        $postState = array_merge($postState, $extraState);

        $postResult = $postHandler->evaluate([true], $postSettings, $postState);
        $this->saveState($config->id, $serverId, $postNodeId, $postResult);

        if ($postResult->cancelTimers) {
            NodeTaskScheduler::cancelByNode($postNodeId, $branch['metric'], $serverId);
        }

        if ($postResult->timer !== null) {
            $timers[] = [
                'node_config_id' => $config->id,
                'node_id' => $postNodeId,
                'delay_ms' => $postResult->timer->delayMs,
                'context' => array_merge($postResult->timer->context, $extraState),
            ];
        }

        return ['timers' => $timers];
    }

    /**
     * Fire a timer on a time node. Searches branches for matching timing_node_id or post_action node_id.
     */
    public function fireTimer(NodeConfig $config, string $nodeId, array $context = [], ?int $serverId = null): array
    {
        $compiledRules = $config->compiled_config ?? $this->compileConfig($config);
        $branches = $compiledRules['branches'] ?? [];

        $targetMetricType = $context['metric_type'] ?? null;

        foreach ($branches as $branch) {
            if ($targetMetricType !== null && ($branch['metric'] ?? null) !== $targetMetricType) {
                continue;
            }

            foreach ($branch['sub_branches'] as $subBranch) {
                if ($subBranch['timing_node_id'] === $nodeId) {
                    $result = $this->fireTimerForSubBranch($config, $branch, $subBranch, $context, $serverId);

                    return [
                        'success' => true,
                        'propagated' => ! empty($result['actions']),
                        'outputs' => [],
                        'timers' => $result['timers'],
                        'actions' => $result['actions'],
                    ];
                }

                if ($subBranch['post_action'] && $subBranch['post_action']['node_id'] === $nodeId) {
                    $result = $this->firePostActionTimer($config, $branch, $subBranch, $context, $serverId);

                    return [
                        'success' => true,
                        'propagated' => ! empty($result['actions']),
                        'outputs' => [],
                        'timers' => $result['timers'],
                        'actions' => $result['actions'],
                    ];
                }
            }
        }

        return ['success' => true, 'propagated' => false];
    }

    /**
     * Fire a timer for a timing sub-branch (sustained, check_after).
     */
    private function fireTimerForSubBranch(
        NodeConfig $config,
        array $branch,
        array $subBranch,
        array $context,
        ?int $serverId,
    ): array {
        $timers = [];
        $actions = [];

        // ── Chain sub_branch: route to dedicated chain handler ──────
        if (! empty($subBranch['timing_chain'])) {
            return $this->fireTimerForChain($config, $branch, $subBranch, $context, $serverId);
        }

        $nodeMap = $this->buildNodeMap($config->getParsedConfig()['nodes'] ?? []);

        $timingType = $subBranch['timing']['type'];
        $timingHandler = $this->registry->get($timingType);
        if (! $timingHandler) {
            return ['timers' => [], 'actions' => []];
        }

        // ── Re-verify live condition at timer-fire time ───────
        // If the upstream condition is no longer met (e.g. server came back online),
        // cancel this timer and all sibling timers for this node/metric/server.
        if (! $this->liveConditionStillHolds($branch, $serverId)) {
            NodeTaskScheduler::cancelByNode($subBranch['timing_node_id'], $branch['metric'], $serverId);
            $this->saveState(
                $config->id,
                $serverId,
                $subBranch['timing_node_id'],
                new NodeResult(false, false, null, ['phase' => 'idle', 'repeat_count' => 0], [], true),
                $branch['metric'],
            );

            return ['timers' => [], 'actions' => []];
        }

        $timingNode = $nodeMap[$subBranch['timing_node_id']] ?? null;
        $timingSettings = $timingNode['settings'] ?? [];

        $persistedStates = $this->loadStates($config->id, $serverId, $branch['metric']);
        $timingState = $persistedStates[$subBranch['timing_node_id']] ?? [];
        $timingState['timer_fire'] = true;
        $timingState = array_merge($timingState, $context);

        if ($timingType === 'sustained' && $branch['condition']) {
            $timingState['threshold'] = $branch['condition']['threshold'];
            $timingState['operator'] = $branch['condition']['operator'];
            $timingState['metric_type'] = $branch['metric'];
            if ($serverId !== null) {
                $timingState['server_id'] = $serverId;
            }
        }

        $timingResult = $timingHandler->evaluate([], $timingSettings, $timingState);
        $this->saveState($config->id, $serverId, $subBranch['timing_node_id'], $timingResult, $branch['metric']);

        if ($timingResult->cancelTimers) {
            NodeTaskScheduler::cancelByNode($subBranch['timing_node_id'], $branch['metric'], $serverId);
        }

        if (! $timingResult->shouldPropagate && empty($timingResult->outputs)) {
            return ['timers' => [], 'actions' => []];
        }

        if ($timingResult->timer !== null) {
            $timers[] = [
                'node_config_id' => $config->id,
                'node_id' => $subBranch['timing_node_id'],
                'delay_ms' => $timingResult->timer->delayMs,
                'context' => array_merge($context, $timingState, $timingResult->timer->context),
            ];
        }

        $timingPropagated = $timingResult->shouldPropagate && $timingResult->value === true;

        // ── Evaluate action node ─────────────────────────────
        if ($timingPropagated && $subBranch['action'] && $subBranch['action_node_id']) {
            $actionHandler = $this->registry->get('notification');
            $actionNode = $nodeMap[$subBranch['action_node_id']] ?? null;
            $actionSettings = $actionNode['settings'] ?? $subBranch['action'];

            $actionState = $persistedStates[$subBranch['action_node_id']] ?? [];
            $actionState = array_merge($actionState, $context);

            $actionResult = $actionHandler->evaluate([true], $actionSettings, $actionState);
            $this->saveState($config->id, $serverId, $subBranch['action_node_id'], $actionResult);

            if ($actionResult->shouldPropagate && $actionResult->value) {
                $upstreamContext = $this->buildUpstreamContext($branch, $subBranch, null);
                $upstreamContext = array_merge($upstreamContext, $context);
                if (isset($upstreamContext['first_trigger_timestamp'])) {
                    $firstTrigger = Carbon::parse($upstreamContext['first_trigger_timestamp']);
                    $elapsedMs = $firstTrigger->diffInMilliseconds(now());
                    $upstreamContext['sustain_value'] = $this->formatDuration($elapsedMs);
                }
                $upstreamContext['repeat_count'] = $timingResult->state['repeat_count'] ?? 0;
                $repeatInterval = $timingSettings['repeat_interval'] ?? '';
                $upstreamContext['repeat_interval'] = $repeatInterval
                    ? $this->formatDuration(BaseNode::parseDurationToMs($repeatInterval))
                    : '';
                $upstreamContext['repeat_max'] = (int) ($timingSettings['repeat_max_repeats'] ?? -1);
                $actions[] = [
                    'node_id' => $subBranch['action_node_id'],
                    'type' => 'notification',
                    'settings' => $actionSettings,
                    'value' => true,
                    'upstream_context' => $upstreamContext,
                ];

                // ── Evaluate post-action node ─────────────────
                if ($subBranch['post_action']) {
                    $postResult = $this->evaluatePostAction(
                        $config,
                        $subBranch['post_action'],
                        $branch,
                        $context,
                        $serverId,
                        $nodeMap,
                        $persistedStates,
                    );
                    $timers = array_merge($timers, $postResult['timers']);
                }
            }
        }

        return ['timers' => $timers, 'actions' => $actions];
    }

    /**
     * Heartbeat evaluation for a compiled timing-chain sub_branch.
     *
     * Schedules one timer per chain step, each at the step's cumulative duration.
     * When a step's timer fires, only that step is verified and actioned.
     * Step 0's SustainedNode heartbeat state machine drives the pending/idle/firing phase.
     */
    private function evaluateChainSubBranch(
        NodeConfig $config,
        array $subBranch,
        array $branch,
        bool $conditionPassed,
        array $extraState,
        ?int $serverId,
        array $nodeMap,
    ): array {
        $timers = [];
        $chainRootNodeId = $subBranch['timing_node_id'];

        $persistedStates = $this->loadStates($config->id, $serverId, $branch['metric']);
        $chainRootState = $persistedStates[$chainRootNodeId] ?? [];
        $phase = $chainRootState['phase'] ?? 'idle';

        // Use step 0's node settings for SustainedNode's heartbeat state machine.
        $step0 = $subBranch['timing_chain'][0];
        $step0TimingNode = $nodeMap[$step0['timing_node_id']] ?? null;
        $step0Settings = $step0TimingNode['settings'] ?? [];
        $timingHandler = $this->registry->get('sustained');

        $timingState = array_merge($chainRootState, $extraState);
        if ($branch['condition']) {
            $timingState['threshold'] = $branch['condition']['threshold'];
            $timingState['operator'] = $branch['condition']['operator'];
            $timingState['metric_type'] = $branch['metric'];
            if ($serverId !== null) {
                $timingState['server_id'] = $serverId;
            }
        }

        // Always evaluate through SustainedNode so it can cancel active chains
        // when the live condition drops below threshold.
        $timingInput = $conditionPassed ? [$conditionPassed] : [null];
        $timingResult = $timingHandler->evaluate($timingInput, $step0Settings, $timingState);
        $this->saveState($config->id, $serverId, $chainRootNodeId, $timingResult, $branch['metric']);

        if ($timingResult->cancelTimers) {
            NodeTaskScheduler::cancelByNode($chainRootNodeId, $branch['metric'], $serverId);
        }

        // If chain is already active, don't start a new timer.
        // But if the phase is non-idle yet no task is actually scheduled (e.g. the
        // task was lost due to a cache flush or process restart), reset to idle so
        // the next heartbeat can re-arm the chain instead of being permanently stuck.
        if (in_array($phase, ['pending', 'firing', 'repeating'])) {
            $hasActiveTask = ! empty(NodeTaskScheduler::getActiveTasks($config->id, $serverId));
            if ($hasActiveTask) {
                return ['timers' => [], 'actions' => [], 'outputs' => []];
            }
            // No live task — phase is stale; fall through to re-arm below.
            Log::info('[chain] Phase was stale (no active task), resetting to idle', [
                'chain' => $chainRootNodeId,
                'metric' => $branch['metric'],
                'server_id' => $serverId,
                'phase' => $phase,
            ]);
            $this->saveState(
                $config->id, $serverId, $chainRootNodeId,
                new NodeResult(false, false, null, ['phase' => 'idle', 'repeat_count' => 0], [], false),
                $branch['metric'],
            );
        }

        // If condition not met and chain is idle, nothing to start.
        if (! $conditionPassed) {
            return ['timers' => [], 'actions' => [], 'outputs' => []];
        }

        // Condition met and chain is idle — start the chain.
        if ($timingResult->timer !== null) {
            $chainStepsMeta = array_map(fn ($s) => [
                'timing_node_id' => $s['timing_node_id'],
                'duration_ms' => $s['timing']['duration_ms'] ?? 0,
            ], $subBranch['timing_chain']);

            $firstStepMeta = $chainStepsMeta[0] ?? [];
            $firstTriggerTimestamp = now()->toISOString();
            $timers[] = [
                'node_config_id' => $config->id,
                'node_id' => $chainRootNodeId,
                'delay_ms' => $firstStepMeta['duration_ms'] ?? 0,
                'context' => array_merge(
                    $extraState,
                    $timingState,
                    $timingResult->timer->context,
                    [
                        'chain_steps_meta' => $chainStepsMeta,
                        'first_trigger_timestamp' => $firstTriggerTimestamp,
                        'chain_step_index' => 0,
                    ],
                ),
            ];
        }

        return ['timers' => $timers, 'actions' => [], 'outputs' => []];
    }

    /**
     * Fire a chain timer. Non-repeat fires evaluate a single step (given by
     * chain_step_index) and cascade to the next step; repeat fires only
     * re-check the last step. If a step's DB check fails, the chain resets.
     */
    private function fireTimerForChain(
        NodeConfig $config,
        array $branch,
        array $subBranch,
        array $context,
        ?int $serverId,
    ): array {
        $nodeMap = $this->buildNodeMap($config->getParsedConfig()['nodes'] ?? []);
        $chainRootNodeId = $subBranch['timing_node_id'];

        // ── Guard: live condition must still hold ────────────────
        if (! $this->liveConditionStillHolds($branch, $serverId)) {
            Log::info('[chain-fire] Live condition FAILED — resetting chain', [
                'server_id' => $serverId,
                'chain' => $chainRootNodeId,
            ]);
            $this->resetChain($config, $branch, $serverId, $chainRootNodeId, true);

            return ['timers' => [], 'actions' => []];
        }

        return ($context['repeat_fire'] ?? false)
            ? $this->fireChainRepeat($config, $branch, $subBranch, $context, $serverId, $nodeMap)
            : $this->fireChainStep($config, $branch, $subBranch, $context, $serverId, $nodeMap);
    }

    /**
     * Non-repeat chain fire: evaluate the step at chain_step_index, fire its
     * action, and either cascade to the next step's timer or — for the last
     * step — run the final action + repeat handling.
     */
    private function fireChainStep(
        NodeConfig $config,
        array $branch,
        array $subBranch,
        array $context,
        ?int $serverId,
        array $nodeMap,
    ): array {
        $chain = $subBranch['timing_chain'];
        $chainRootNodeId = $subBranch['timing_node_id'];
        $lastStepIdx = count($chain) - 1;
        $stepIdx = (int) ($context['chain_step_index'] ?? 0);

        if ($stepIdx > $lastStepIdx) {
            return ['timers' => [], 'actions' => []];
        }

        $persistedStates = $this->loadStates($config->id, $serverId, $branch['metric']);
        $timingResult = $this->evaluateChainStepTiming(
            $config, $branch, $context, $serverId, $nodeMap, $persistedStates, $chain, $chainRootNodeId, $stepIdx,
        );

        if ($timingResult === null) {
            $this->resetChain($config, $branch, $serverId, $chainRootNodeId, false);

            return ['timers' => [], 'actions' => []];
        }

        // ── Last step reached → final action + repeat handling ──
        if ($stepIdx === $lastStepIdx) {
            $this->saveState($config->id, $serverId, $chainRootNodeId, $timingResult, $branch['metric']);

            return $this->fireLastStepAction(
                $config, $branch, $subBranch, $chain[$lastStepIdx],
                $context, $serverId, $nodeMap, $persistedStates, $timingResult,
            );
        }

        // ── Intermediate step: fire this step's action, then cascade ──
        $actions = [];
        $step = $chain[$stepIdx];
        if (! empty($step['action_node_id'])) {
            $actions = $this->fireStepAction($config, $branch, $subBranch, $step, $context, $serverId, $nodeMap, $persistedStates);
        }

        $chainStepsMeta = $context['chain_steps_meta'] ?? [];
        $currentMeta = $chainStepsMeta[$stepIdx] ?? [];
        $nextMeta = $chainStepsMeta[$stepIdx + 1] ?? [];
        $nextDelay = ($nextMeta['duration_ms'] ?? 0) - ($currentMeta['duration_ms'] ?? 0);

        $timers[] = [
            'node_config_id' => $config->id,
            'node_id' => $chainRootNodeId,
            'delay_ms' => max(0, $nextDelay),
            'context' => array_merge($context, [
                'chain_step_index' => $stepIdx + 1,
            ]),
        ];

        return ['timers' => $timers, 'actions' => $actions];
    }

    /**
     * Repeat fire: only the last step is re-checked; prior step states stay frozen.
     */
    private function fireChainRepeat(
        NodeConfig $config,
        array $branch,
        array $subBranch,
        array $context,
        ?int $serverId,
        array $nodeMap,
    ): array {
        $chain = $subBranch['timing_chain'];
        $chainRootNodeId = $subBranch['timing_node_id'];
        $lastStepIdx = count($chain) - 1;
        $lastStep = $chain[$lastStepIdx];

        $persistedStates = $this->loadStates($config->id, $serverId, $branch['metric']);
        $timingResult = $this->evaluateChainStepTiming(
            $config, $branch, $context, $serverId, $nodeMap, $persistedStates, $chain, $chainRootNodeId, $lastStepIdx,
        );

        if ($timingResult === null) {
            $this->resetChain($config, $branch, $serverId, $chainRootNodeId, false);

            return ['timers' => [], 'actions' => []];
        }

        $this->saveState($config->id, $serverId, $chainRootNodeId, $timingResult, $branch['metric']);

        return $this->fireLastStepAction(
            $config, $branch, $subBranch, $lastStep,
            $context, $serverId, $nodeMap, $persistedStates, $timingResult,
        );
    }

    /**
     * Evaluate one chain step's timing node against the DB window.
     * Returns the NodeResult, or null when the step fails (chain resets).
     */
    private function evaluateChainStepTiming(
        NodeConfig $config,
        array $branch,
        array $context,
        ?int $serverId,
        array $nodeMap,
        array $persistedStates,
        array $chain,
        string $chainRootNodeId,
        int $stepIdx,
    ): ?NodeResult {
        $timingHandler = $this->registry->get('sustained');
        $step = $chain[$stepIdx];

        $baseTimingState = array_merge(
            $persistedStates[$chainRootNodeId] ?? [],
            $persistedStates[$step['timing_node_id']] ?? [],
        );
        $baseTimingState['timer_fire'] = true;
        $baseTimingState = array_merge($baseTimingState, $context);

        if ($branch['condition']) {
            $baseTimingState['threshold'] = $branch['condition']['threshold'];
            $baseTimingState['operator'] = $branch['condition']['operator'];
            $baseTimingState['metric_type'] = $branch['metric'];
            if ($serverId !== null) {
                $baseTimingState['server_id'] = $serverId;
            }
        }

        $stepTimingNode = $nodeMap[$step['timing_node_id']] ?? null;
        $stepSettings = $stepTimingNode['settings'] ?? [];

        $timingResult = $timingHandler->evaluate([], $stepSettings, $baseTimingState);
        $this->saveState($config->id, $serverId, $step['timing_node_id'], $timingResult, $branch['metric']);

        if (! $timingResult->shouldPropagate || $timingResult->value !== true) {
            Log::info("[chain-fire] Step {$stepIdx} ({$step['timing_node_id']}) DB check FAILED — resetting chain", [
                'chain_root' => $chainRootNodeId,
                'server_id' => $serverId,
            ]);

            return null;
        }

        return $timingResult;
    }

    /**
     * Fire an intermediate chain step's action node.
     */
    private function fireStepAction(
        NodeConfig $config,
        array $branch,
        array $subBranch,
        array $step,
        array $context,
        ?int $serverId,
        array $nodeMap,
        array $persistedStates,
    ): array {
        $actions = [];

        $actionNode = $nodeMap[$step['action_node_id']] ?? null;
        $actionType = $actionNode['type'] ?? ($step['action']['type'] ?? 'notification');
        $actionHandler = $this->registry->get($actionType) ?? $this->registry->get('notification');
        $actionSettings = $actionNode['settings'] ?? ($step['action'] ?? []);

        $actionState = $persistedStates[$step['action_node_id']] ?? [];
        $actionState = array_merge($actionState, $context);
        $actionState['sustain_value'] = $this->formatDuration($step['timing']['duration_ms'] ?? 0);

        $actionResult = $actionHandler->evaluate([true], $actionSettings, $actionState);
        $this->saveState($config->id, $serverId, $step['action_node_id'], $actionResult, $branch['metric']);

        if ($actionResult->shouldPropagate && $actionResult->value) {
            $upstreamContext = $this->buildUpstreamContext($branch, $subBranch, null);
            $upstreamContext = array_merge($upstreamContext, $context, [
                'sustain_value' => $this->formatDuration($step['timing']['duration_ms'] ?? 0),
            ]);
            $actions[] = [
                'node_id' => $step['action_node_id'],
                'type' => $actionType,
                'settings' => $actionSettings,
                'value' => true,
                'upstream_context' => $upstreamContext,
            ];
        }

        return $actions;
    }

    /**
     * Fire the last step's action, schedule its repeat timer, handle any
     * post_action, and reset the chain when no repeat timer was scheduled.
     */
    private function fireLastStepAction(
        NodeConfig $config,
        array $branch,
        array $subBranch,
        array $lastStep,
        array $context,
        ?int $serverId,
        array $nodeMap,
        array $persistedStates,
        NodeResult $lastResult,
    ): array {
        $timers = [];
        $actions = [];
        $chainRootNodeId = $subBranch['timing_node_id'];

        if ($lastStep['action_node_id']) {
            $actionNode = $nodeMap[$lastStep['action_node_id']] ?? null;
            $actionType = $actionNode['type'] ?? ($lastStep['action']['type'] ?? 'notification');
            $actionHandler = $this->registry->get($actionType) ?? $this->registry->get('notification');
            $actionSettings = $actionNode['settings'] ?? ($lastStep['action'] ?? []);
            $lastStepNodeSettings = ($nodeMap[$lastStep['timing_node_id']] ?? [])['settings'] ?? [];

            $actionState = $persistedStates[$lastStep['action_node_id']] ?? [];
            $actionState = array_merge($actionState, $context);

            $actionResult = $actionHandler->evaluate([true], $actionSettings, $actionState);
            $this->saveState($config->id, $serverId, $lastStep['action_node_id'], $actionResult);

            if ($actionResult->shouldPropagate && $actionResult->value) {
                $contextSubBranch = array_merge($subBranch, [
                    'timing_node_id' => $lastStep['timing_node_id'],
                    'action_node_id' => $lastStep['action_node_id'],
                ]);
                $upstreamContext = $this->buildUpstreamContext($branch, $contextSubBranch, null);
                $upstreamContext = array_merge($upstreamContext, $context);
                if (isset($upstreamContext['first_trigger_timestamp'])) {
                    $firstTrigger = Carbon::parse($upstreamContext['first_trigger_timestamp']);
                    $elapsedMs = $firstTrigger->diffInMilliseconds(now());
                    $upstreamContext['sustain_value'] = $this->formatDuration($elapsedMs);
                }
                $upstreamContext['repeat_count'] = $lastResult->state['repeat_count'] ?? 0;
                $repeatInterval = $lastStepNodeSettings['repeat_interval'] ?? '';
                $upstreamContext['repeat_interval'] = $repeatInterval
                    ? $this->formatDuration(BaseNode::parseDurationToMs($repeatInterval))
                    : '';
                $upstreamContext['repeat_max'] = (int) ($lastStepNodeSettings['repeat_max_repeats'] ?? -1);

                $actions[] = [
                    'node_id' => $lastStep['action_node_id'],
                    'type' => $actionType,
                    'settings' => $actionSettings,
                    'value' => true,
                    'upstream_context' => $upstreamContext,
                ];

                // ── Repeat timer ──────────────────────────────────
                if ($lastResult->timer !== null) {
                    $timers[] = [
                        'node_config_id' => $config->id,
                        'node_id' => $chainRootNodeId,
                        'delay_ms' => $lastResult->timer->delayMs,
                        'context' => array_merge($lastResult->timer->context, $context, [
                            'chain_steps_meta' => $context['chain_steps_meta'] ?? null,
                            'first_trigger_timestamp' => $context['first_trigger_timestamp'] ?? now()->toISOString(),
                            'repeat_fire' => true,
                        ]),
                    ];
                }

                if (! empty($lastStep['post_action'])) {
                    $postAction = $lastStep['post_action'];
                    $postType = $postAction['type'] ?? 'repeat';
                    $postHandler = $this->registry->get($postType);
                    if ($postHandler) {
                        $postNodeId = $postAction['node_id'];
                        $postSettings = $postAction['settings'] ?? [];
                        $postState = $persistedStates[$postNodeId] ?? [];
                        $postResult = $postHandler->evaluate([true], $postSettings, $postState);
                        $this->saveState($config->id, $serverId, $postNodeId, $postResult);

                        if ($postResult->timer !== null) {
                            $timers[] = [
                                'node_config_id' => $config->id,
                                'node_id' => $postNodeId,
                                'delay_ms' => $postResult->timer->delayMs,
                                'context' => array_merge($postResult->timer->context, $context, [
                                    'chain_steps_meta' => $context['chain_steps_meta'] ?? null,
                                    'metric_type' => $branch['metric'],
                                ]),
                            ];
                        }
                    }
                }
            }
        }

        // ── Reset chain if no repeat timer was scheduled ─────────
        if (empty($timers)) {
            $this->resetChain($config, $branch, $serverId, $chainRootNodeId, false);
        }

        return ['timers' => $timers, 'actions' => $actions];
    }

    /**
     * Cancel a chain's timers and reset its root state to idle.
     */
    private function resetChain(
        NodeConfig $config,
        array $branch,
        ?int $serverId,
        string $chainRootNodeId,
        bool $cancelTimers,
    ): void {
        NodeTaskScheduler::cancelByNode($chainRootNodeId, $branch['metric'], $serverId);
        $this->saveState(
            $config->id, $serverId, $chainRootNodeId,
            new NodeResult(false, false, null, ['phase' => 'idle'], [], $cancelTimers),
            $branch['metric'],
        );
    }

    /**
     * Fire a timer for a post-action node (repeat after notification).
     */
    private function firePostActionTimer(
        NodeConfig $config,
        array $branch,
        array $subBranch,
        array $context,
        ?int $serverId,
    ): array {
        $timers = [];
        $actions = [];

        // ── Re-verify live condition at timer-fire time ───────
        if (! $this->liveConditionStillHolds($branch, $serverId)) {
            $postAction = $subBranch['post_action'];
            if ($postAction) {
                NodeTaskScheduler::cancelByNode($postAction['node_id'], $branch['metric'], $serverId);
                $this->saveState(
                    $config->id,
                    $serverId,
                    $postAction['node_id'],
                    new NodeResult(false, false, null, ['phase' => 'idle', 'repeat_count' => 0], [], true),
                    $branch['metric'],
                );
            }

            return ['timers' => [], 'actions' => []];
        }

        $nodeMap = $this->buildNodeMap($config->getParsedConfig()['nodes'] ?? []);
        $postAction = $subBranch['post_action'];

        $postType = $postAction['type'];
        $postHandler = $this->registry->get($postType);
        if (! $postHandler) {
            return ['timers' => [], 'actions' => []];
        }

        $postSettings = $postAction['settings'] ?? [];
        $postNodeId = $postAction['node_id'];

        $persistedStates = $this->loadStates($config->id, $serverId);
        $postState = $persistedStates[$postNodeId] ?? [];
        $postState['timer_fire'] = true;
        $postState = array_merge($postState, $context);

        $postResult = $postHandler->evaluate([], $postSettings, $postState);
        $this->saveState($config->id, $serverId, $postNodeId, $postResult);

        if (! $postResult->shouldPropagate && empty($postResult->outputs)) {
            return ['timers' => [], 'actions' => []];
        }

        if ($postResult->cancelTimers) {
            NodeTaskScheduler::cancelByNode($postNodeId, $branch['metric'], $serverId);
        }

        if ($postResult->timer !== null) {
            $timers[] = [
                'node_config_id' => $config->id,
                'node_id' => $postNodeId,
                'delay_ms' => $postResult->timer->delayMs,
                'context' => array_merge($postResult->timer->context, $context),
            ];
        }

        $postPropagated = $postResult->shouldPropagate && $postResult->value === true;

        if ($postPropagated && $subBranch['action'] && $subBranch['action_node_id']) {
            $actionNode = $nodeMap[$subBranch['action_node_id']] ?? null;
            $actionType = $actionNode['type'] ?? ($subBranch['action']['type'] ?? 'notification');
            $actionHandler = $this->registry->get($actionType) ?? $this->registry->get('notification');
            $actionSettings = $actionNode['settings'] ?? $subBranch['action'];

            $actionState = $persistedStates[$subBranch['action_node_id']] ?? [];
            $actionState = array_merge($actionState, $context);

            $actionResult = $actionHandler->evaluate([true], $actionSettings, $actionState);
            $this->saveState($config->id, $serverId, $subBranch['action_node_id'], $actionResult);

            if ($actionResult->shouldPropagate && $actionResult->value) {
                $upstreamContext = $this->buildUpstreamContext($branch, $subBranch, null);
                $upstreamContext = array_merge($upstreamContext, $context);
                $actions[] = [
                    'node_id' => $subBranch['action_node_id'],
                    'type' => $actionType,
                    'settings' => $actionSettings,
                    'value' => true,
                    'upstream_context' => $upstreamContext,
                ];
            }
        }

        return ['timers' => $timers, 'actions' => $actions];
    }

    /**
     * Find the metric node ID for a given metric type.
     */
    public function findMetricNode(NodeConfig $config, string $metricType): ?string
    {
        $nodes = $config->getParsedConfig()['nodes'] ?? [];

        foreach ($nodes as $node) {
            if (($node['type'] ?? '') === 'metric' && ($node['settings']['metric_type'] ?? '') === $metricType) {
                return $node['id'];
            }
        }

        return null;
    }

    private function compileConfig(NodeConfig $config): array
    {
        $compiler = new NodeConfigCompiler;

        return $compiler->compile($config->getParsedConfig());
    }

    private function buildNodeMap(array $nodes): array
    {
        $map = [];
        foreach ($nodes as $node) {
            $map[$node['id']] = $node;
        }

        return $map;
    }

    private function loadStates(int $configId, ?int $serverId, ?string $metricType = null): array
    {
        $query = NodeConfigState::where('node_config_id', $configId);
        if ($serverId !== null) {
            $query->where('server_id', $serverId);
        }
        $states = $query->get();

        // Two-pass: collect scoped rows first, then fill bare rows only if no scoped row exists.
        // This ensures "sustained_10:memory_usage" always wins over a stale bare "sustained_10" row.
        $scoped = [];
        $bare = [];

        foreach ($states as $s) {
            $rawNodeId = $s->node_id;
            $ctx = $s->context ?? [];

            if (str_contains($rawNodeId, ':')) {
                [$baseNodeId, $storedMetric] = explode(':', $rawNodeId, 2);
                if ($metricType !== null && $storedMetric !== $metricType) {
                    continue;
                }
                $scoped[$baseNodeId] = $ctx;
            } else {
                $bare[$rawNodeId] = $ctx;
            }
        }

        // Scoped rows take priority; bare rows fill in only for node IDs with no scoped row
        return array_merge($bare, $scoped);
    }

    private function saveState(int $configId, ?int $serverId, string $nodeId, NodeResult $result, ?string $metricType = null): void
    {
        // For metric-specific branches (like sustained nodes), store per metric_type to avoid overwriting state
        $scopedNodeId = ($metricType !== null) ? "{$nodeId}:{$metricType}" : $nodeId;

        $context = $result->state;
        if ($metricType !== null && ! isset($context['metric_type'])) {
            $context['metric_type'] = $metricType;
        }

        $attributes = ['node_config_id' => $configId, 'node_id' => $scopedNodeId];
        if ($serverId !== null) {
            $attributes['server_id'] = $serverId;
        }

        $values = [
            'output_value' => $result->shouldPropagate ? ['value' => $result->value] : null,
            'context' => $context,
        ];

        try {
            NodeConfigState::updateOrCreate($attributes, $values);
        } catch (UniqueConstraintViolationException $e) {
            // Race condition: another concurrent job just inserted this row.
            // Do a blind UPDATE to set our values without re-checking existence.
            NodeConfigState::where(
                ['node_config_id' => $configId, 'node_id' => $scopedNodeId]
            )->update($values);
        }
    }

    private function loadBranchLatch(int $configId, ?int $serverId, string $branchKey): bool
    {
        $query = NodeConfigState::where('node_config_id', $configId)
            ->where('node_id', 'branch:'.$branchKey);
        if ($serverId !== null) {
            $query->where('server_id', $serverId);
        }

        $state = $query->first();

        return (bool) ($state->context['armed'] ?? false);
    }

    private function saveBranchLatch(int $configId, ?int $serverId, string $branchKey, bool $armed): void
    {
        $attributes = ['node_config_id' => $configId, 'node_id' => 'branch:'.$branchKey];
        if ($serverId !== null) {
            $attributes['server_id'] = $serverId;
        }

        $values = ['context' => ['armed' => $armed]];

        try {
            NodeConfigState::updateOrCreate($attributes, $values);
        } catch (UniqueConstraintViolationException $e) {
            // Race condition: another concurrent job just inserted this row.
            NodeConfigState::where(
                ['node_config_id' => $configId, 'node_id' => 'branch:'.$branchKey]
            )->update($values);
        }
    }

    /**
     * Whether any timing/chain/post-action task for this branch is currently scheduled.
     * While one is in flight the latch must hold, so a false condition can't cancel it.
     */
    private function branchHasActiveEvaluation(NodeConfig $config, array $branch, ?int $serverId): bool
    {
        $taskNodeIds = [];
        foreach ($branch['sub_branches'] as $subBranch) {
            if (! empty($subBranch['timing_node_id'])) {
                $taskNodeIds[$subBranch['timing_node_id']] = true;
            }
            if (! empty($subBranch['post_action']['node_id'])) {
                $taskNodeIds[$subBranch['post_action']['node_id']] = true;
            }
            foreach ($subBranch['timing_chain'] ?? [] as $step) {
                if (! empty($step['timing_node_id'])) {
                    $taskNodeIds[$step['timing_node_id']] = true;
                }
            }
        }

        if (empty($taskNodeIds)) {
            return false;
        }

        foreach (NodeTaskScheduler::getActiveTasks($config->id, $serverId) as $task) {
            if (isset($taskNodeIds[$task['node_id']])) {
                return true;
            }
        }

        return false;
    }

    private function resolveNodeInputs(
        string $nodeId,
        array $nodeMap,
        string $nodeType,
        array $branch,
        mixed $metricResult,
    ): array {
        if ($nodeType === 'severity') {
            return [$metricResult->value, null];
        }

        // Multi-output metrics (server_status, ports_ping): feed the condition the
        // value emitted on this branch's source socket rather than metric result value.
        $handle = $branch['metric_source_handle'] ?? 'output';
        if ($handle !== 'output' && ! empty($metricResult->outputs)) {
            return [$metricResult->outputs[$handle] ?? null];
        }

        return [$metricResult->value];
    }

    /**
     * Override condition settings that are supplied by a wired Template input node.
     * The template id is resolved against the injected evaluation context (extra_state).
     */
    private function resolveTemplateRefs(array $settings, array $refs, array $extraState, array $templateStrings = []): array
    {
        foreach ($refs as $setting => $ref) {
            $id = $ref['template_id'] ?? null;
            if ($id === null || $id === '') {
                continue;
            }

            // Priority: alert-system injection (bare or {<id>}) overrides the compiled value.
            if (array_key_exists($id, $extraState)) {
                $value = $extraState[$id];
            } elseif (array_key_exists('{'.$id.'}', $extraState)) {
                $value = $extraState['{'.$id.'}'];
            } elseif (array_key_exists($id, $templateStrings) && $templateStrings[$id] !== null && $templateStrings[$id] !== '') {
                $value = $templateStrings[$id];
            } else {
                continue;
            }

            $settings[$setting] = match ($ref['data_type'] ?? 'number') {
                'boolean' => filter_var($value, FILTER_VALIDATE_BOOL),
                'string' => (string) $value,
                default => is_numeric($value) ? (float) $value : $value,
            };
        }

        return $settings;
    }

    private function buildUpstreamContext(array $branch, array $subBranch, mixed $value): array
    {
        $metricType = $branch['metric'];
        $metricName = self::METRIC_NAMES[$metricType] ?? $metricType;

        $sustainValue = null;
        if ($subBranch['timing'] && isset($subBranch['timing']['duration_ms'])) {
            $sustainValue = $this->formatDuration($subBranch['timing']['duration_ms']);
        }

        return [
            'metric_name' => $metricName,
            'sustain_value' => $sustainValue,
            // ports_ping: feed the actual ping latency and the resolved threshold
            // (static or the compiled/alert-system template value) into the notify context.
            'ping' => is_numeric($value) ? (float) $value : null,
            'threshold' => $branch['condition']['threshold'] ?? null,
        ];
    }

    private function formatDuration(int $ms): string
    {
        $totalSeconds = intdiv($ms, 1000);

        $weeks = intdiv($totalSeconds, 604800);
        $remain = $totalSeconds % 604800;
        $days = intdiv($remain, 86400);
        $remain = $remain % 86400;
        $hours = intdiv($remain, 3600);
        $remain = $remain % 3600;
        $minutes = intdiv($remain, 60);
        $seconds = $remain % 60;

        $parts = [];
        if ($weeks > 0) {
            $parts[] = "{$weeks}w";
        }
        if ($days > 0) {
            $parts[] = "{$days}d";
        }
        if ($hours > 0) {
            $parts[] = "{$hours}h";
        }
        if ($minutes > 0) {
            $parts[] = "{$minutes}m";
        }
        if ($seconds > 0) {
            $parts[] = "{$seconds}s";
        }

        return ! empty($parts) ? implode('', $parts) : '0s';
    }

    /**
     * Re-verify whether the upstream branch condition still holds against current live data.
     *
     * For server_status branches: checks Agent.last_seen_at vs the configured offline threshold.
     * For metric branches: re-evaluates the latest MetricSample value against the condition threshold.
     * Returns true (keep timers alive) when the condition is still met or when we cannot
     * determine the live state (fail-open so we don't suppress valid alerts).
     */
    private function liveConditionStillHolds(array $branch, ?int $serverId): bool
    {
        if ($serverId === null) {
            return true; // Cannot determine without a server – fail open
        }

        $metricType = $branch['metric'] ?? null;
        $sourceHandle = $branch['metric_source_handle'] ?? 'output';

        // ── server_status: check whether the agent is still offline ──────
        if ($metricType === 'server_status') {
            $agent = Agent::where('server_id', $serverId)->first();

            if (! $agent) {
                // No agent record at all → definitively offline
                return $sourceHandle === 'offline';
            }

            $rawOffline = (int) Setting::get('offline_threshold', '15');
            $offlineSec = $rawOffline >= 1000 ? intdiv($rawOffline, 1000) : ($rawOffline ?: 15);
            $isOffline = ! $agent->last_seen_at ||
                $agent->last_seen_at->lt(now()->subSeconds($offlineSec));

            Log::debug('[node-config-engine] live condition check (server_status)', [
                'server_id' => $serverId,
                'is_offline' => $isOffline,
                'source_handle' => $sourceHandle,
                'holds' => $sourceHandle === 'offline' ? $isOffline : ! $isOffline,
            ]);

            return $sourceHandle === 'offline' ? $isOffline : ! $isOffline;
        }

        // ── ports_ping: check whether a tracked port still matches the socket ──
        if ($metricType === 'ports_ping') {
            $agent = Agent::where('server_id', $serverId)->first();
            if (! $agent) {
                return true; // fail open
            }

            $ports = Port::where('agent_id', $agent->id);

            if ($sourceHandle === 'offline') {
                $holds = (clone $ports)->where('ping_status', 'offline')->exists();
            } else {
                $operator = $branch['condition']['operator'] ?? 'greater_than';
                $threshold = (float) ($branch['condition']['threshold'] ?? 0);
                $sqlOp = match ($operator) {
                    'greater_than_equal' => '>=',
                    'less_than' => '<',
                    'less_than_equal' => '<=',
                    'equal' => '=',
                    default => '>',
                };
                $holds = (clone $ports)
                    ->where('ping_status', 'online')
                    ->where('ping_time', $sqlOp, $threshold)
                    ->exists();
            }

            Log::debug('[node-config-engine] live condition check (ports_ping)', [
                'server_id' => $serverId,
                'source_handle' => $sourceHandle,
                'holds' => $holds,
            ]);

            return $holds;
        }

        // ── metric conditions: re-check most recent sample vs threshold ──
        $condition = $branch['condition'] ?? null;
        if ($condition && isset($condition['threshold'], $condition['operator'])) {
            $agent = Agent::where('server_id', $serverId)->first();
            if (! $agent) {
                return true; // fail open
            }

            $metricNameMap = [
                'cpu_usage' => 'load1',
                'memory_usage' => 'percent',
                'disk_usage' => 'percent',
                'network_usage' => 'rx_bytes',
            ];
            $metricName = $metricNameMap[$metricType] ?? $metricType;
            $metricTypeForDb = explode('_', $metricType, 2)[0];

            $latest = MetricSample::whereHas(
                'batch',
                fn ($q) => $q->where('agent_id', $agent->id)
            )
                ->where('metric_type', $metricTypeForDb)
                ->where('metric_name', $metricName)
                ->orderByDesc('recorded_at')
                ->value('value');

            if ($latest === null) {
                return true; // No sample yet – fail open
            }

            $threshold = (float) $condition['threshold'];
            $value = (float) $latest;

            // Operator strings match the condition node's stored format
            $holds = match ($condition['operator']) {
                'greater_than' => $value > $threshold,
                'greater_than_equal' => $value >= $threshold,
                'less_than' => $value < $threshold,
                'less_than_equal' => $value <= $threshold,
                'equal' => $value == $threshold,
                'not_equal' => $value != $threshold,
                default => true,
            };

            Log::debug('[node-config-engine] live condition check (metric)', [
                'server_id' => $serverId,
                'metric' => $metricType,
                'value' => $value,
                'threshold' => $threshold,
                'operator' => $condition['operator'],
                'holds' => $holds,
            ]);

            return $holds;
        }

        return true; // Fail open for unknown branch shapes
    }
}
