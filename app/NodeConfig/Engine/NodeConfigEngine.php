<?php

namespace App\NodeConfig\Engine;

use App\NodeConfig\Models\NodeConfig;
use App\NodeConfig\Models\NodeConfigState;
use App\NodeConfig\NodeTypes\BaseNode;
use App\NodeConfig\NodeTypes\NodeResult;
use App\NodeConfig\NodeTypes\NodeTimer;
use App\NodeConfig\Validation\NodeConfigValidator;
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
    ];

    public function __construct(NodeRegistry $registry)
    {
        $this->registry = $registry;
        $this->validator = new NodeConfigValidator();
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
            fn(array $branch) => $branch['metric_node_id'] === $sourceNodeId,
        ));

        if (empty($matchingBranches)) {
            return ['success' => true, 'outputs' => [], 'timers' => [], 'actions' => []];
        }

        $allTimers = [];
        $allActions = [];
        $allOutputs = [];

        foreach ($matchingBranches as $branch) {
            if (!$this->matchesSourceHandle($branch, $value)) {
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
        if ($handle === 'output')
            return true;
        return $value === $handle;
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

        if (!empty($metricResult->outputs)) {
            $outputs[$metricNodeId] = $metricResult->outputs;
        } elseif ($metricResult->shouldPropagate) {
            $outputs[$metricNodeId] = ['output' => $metricResult->value];
        }

        // ── Evaluate condition node (shared across sub-branches) ──
        $conditionPassed = true;
        if ($branch['condition'] && $branch['condition_node_id']) {
            $conditionNode = $nodeMap[$branch['condition_node_id']] ?? null;
            $conditionHandler = $this->registry->get('condition');
            $conditionSettings = $conditionNode['settings'] ?? $branch['condition'];

            $inputValues = [$metricResult->value];
            $conditionResult = $conditionHandler->evaluate($inputValues, $conditionSettings, $extraState);
            $this->saveState($config->id, $serverId, $branch['condition_node_id'], $conditionResult);

            $conditionPassed = $conditionResult->shouldPropagate && $conditionResult->value === true;

            if (!empty($conditionResult->outputs)) {
                $outputs[$branch['condition_node_id']] = $conditionResult->outputs;
            } elseif ($conditionResult->shouldPropagate) {
                $outputs[$branch['condition_node_id']] = ['output' => $conditionResult->value];
            }
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
        if (!empty($subBranch['timing_chain'])) {
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
            if (!$timingHandler) {
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
                        'first_trigger_timestamp' => now(),
                    ]),
                ];
            }

            $timingPropagated = $timingResult->shouldPropagate && $timingResult->value === true;

            if (!empty($timingResult->outputs)) {
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
        if (!$postHandler) {
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
                        'propagated' => !empty($result['actions']),
                        'outputs' => [],
                        'timers' => $result['timers'],
                        'actions' => $result['actions'],
                    ];
                }

                if ($subBranch['post_action'] && $subBranch['post_action']['node_id'] === $nodeId) {
                    $result = $this->firePostActionTimer($config, $branch, $subBranch, $context, $serverId);
                    return [
                        'success' => true,
                        'propagated' => !empty($result['actions']),
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
        if (!empty($subBranch['timing_chain'])) {
            return $this->fireTimerForChain($config, $branch, $subBranch, $context, $serverId);
        }

        $nodeMap = $this->buildNodeMap($config->getParsedConfig()['nodes'] ?? []);

        $timingType = $subBranch['timing']['type'];
        $timingHandler = $this->registry->get($timingType);
        if (!$timingHandler) {
            return ['timers' => [], 'actions' => []];
        }

        // ── Re-verify live condition at timer-fire time ───────
        // If the upstream condition is no longer met (e.g. server came back online),
        // cancel this timer and all sibling timers for this node/metric/server.
        if (!$this->liveConditionStillHolds($branch, $serverId)) {
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

        if (!$timingResult->shouldPropagate && empty($timingResult->outputs)) {
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
                    $firstTrigger = $upstreamContext['first_trigger_timestamp'];
                    $elapsedMs = $firstTrigger->diffInMilliseconds(now());
                    $upstreamContext['sustain_value'] = $this->formatDuration($elapsedMs);
                }
                $upstreamContext['repeat_count'] = $timingResult->state['repeat_count'] ?? 0;
                $repeatInterval = $timingSettings['repeat_interval'] ?? '';
                $upstreamContext['repeat_interval'] = $repeatInterval
                    ? $this->formatDuration(BaseNode::parseDurationToMs($repeatInterval))
                    : '';
                $upstreamContext['repeat_max'] = (int) ($timingSettings['repeat_max_repeats'] ?? 0);
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
     * Schedules ONE timer at max_duration_ms (the highest step's absolute duration).
     * When that single timer fires, ALL steps are verified and actioned in order.
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
        $timers          = [];
        $chainRootNodeId = $subBranch['timing_node_id'];

        $persistedStates = $this->loadStates($config->id, $serverId, $branch['metric']);
        $chainRootState  = $persistedStates[$chainRootNodeId] ?? [];

        // If a chain timer is already queued or repeating, don't restart.
        if (in_array(($chainRootState['phase'] ?? 'idle'), ['pending', 'firing', 'repeating'])) {
            return ['timers' => [], 'actions' => [], 'outputs' => []];
        }

        // Use step 0's node settings for SustainedNode's heartbeat state machine.
        $step0           = $subBranch['timing_chain'][0];
        $step0TimingNode = $nodeMap[$step0['timing_node_id']] ?? null;
        $step0Settings   = $step0TimingNode['settings'] ?? [];
        $timingHandler   = $this->registry->get('sustained');

        $timingState = array_merge($chainRootState, $extraState);
        if ($branch['condition']) {
            $timingState['threshold']   = $branch['condition']['threshold'];
            $timingState['operator']    = $branch['condition']['operator'];
            $timingState['metric_type'] = $branch['metric'];
            if ($serverId !== null) {
                $timingState['server_id'] = $serverId;
            }
        }

        $timingInput  = $conditionPassed ? [$conditionPassed] : [null];
        $timingResult = $timingHandler->evaluate($timingInput, $step0Settings, $timingState);
        $this->saveState($config->id, $serverId, $chainRootNodeId, $timingResult, $branch['metric']);

        if ($timingResult->cancelTimers) {
            NodeTaskScheduler::cancelByNode($chainRootNodeId, $branch['metric'], $serverId);
        }

        if ($timingResult->timer !== null) {
            // ONE timer fires at max_duration_ms (last step's absolute threshold).
            // All steps are evaluated together when that timer fires.
            $maxDurationMs = $subBranch['max_duration_ms'] ?? $timingResult->timer->delayMs;

            // Embed the chain steps metadata in context so the frontend can show sub-countdowns.
            $chainStepsMeta = array_map(fn($s) => [
                'timing_node_id' => $s['timing_node_id'],
                'duration_ms'    => $s['timing']['duration_ms'] ?? 0,
            ], $subBranch['timing_chain']);

            $timers[] = [
                'node_config_id' => $config->id,
                'node_id'        => $chainRootNodeId,
                'delay_ms'       => $maxDurationMs,
                'context'        => array_merge(
                    $extraState,
                    $timingState,
                    $timingResult->timer->context,
                    ['chain_steps_meta' => $chainStepsMeta],
                    ['first_trigger_timestamp' => now()],
                ),
            ];
        }

        return ['timers' => $timers, 'actions' => [], 'outputs' => []];
    }

    /**
     * Fire the single chain timer: evaluate ALL steps in order.
     *
     * Each step is DB-verified against its own duration_ms threshold.
     * If any step fails — stop immediately (no further steps run).
     * Each passing step fires its own action using its own handler type (not hardcoded).
     * Post-action only fires if the LAST step passes.
     * State is always reset to idle when done (success or failure).
     */
    private function fireTimerForChain(
        NodeConfig $config,
        array $branch,
        array $subBranch,
        array $context,
        ?int $serverId,
    ): array {
        $timers  = [];
        $actions = [];

        $chain           = $subBranch['timing_chain'];
        $chainRootNodeId = $subBranch['timing_node_id'];
        $nodeMap         = $this->buildNodeMap($config->getParsedConfig()['nodes'] ?? []);

        // ── Guard: live condition must still hold ────────────────
        if (!$this->liveConditionStillHolds($branch, $serverId)) {
            NodeTaskScheduler::cancelByNode($chainRootNodeId, $branch['metric'], $serverId);
            $this->saveState(
                $config->id, $serverId, $chainRootNodeId,
                new NodeResult(false, false, null, ['phase' => 'idle'], [], true),
                $branch['metric'],
            );
            return ['timers' => [], 'actions' => []];
        }

        $persistedStates = $this->loadStates($config->id, $serverId, $branch['metric']);
        $timingHandler   = $this->registry->get('sustained');

        // Base timing state shared across all step verifications
        $baseTimingState = $persistedStates[$chainRootNodeId] ?? [];
        $baseTimingState['timer_fire'] = true;
        $baseTimingState = array_merge($baseTimingState, $context);

        if ($branch['condition']) {
            $baseTimingState['threshold']   = $branch['condition']['threshold'];
            $baseTimingState['operator']    = $branch['condition']['operator'];
            $baseTimingState['metric_type'] = $branch['metric'];
            if ($serverId !== null) {
                $baseTimingState['server_id'] = $serverId;
            }
        }

        // ── Evaluate ALL steps in sequence ───────────────────────────────
        foreach ($chain as $stepIdx => $step) {
            // DB-verify this step's sustained duration threshold
            $stepTimingNode = $nodeMap[$step['timing_node_id']] ?? null;
            $stepSettings   = $stepTimingNode['settings'] ?? [];

            $timingResult = $timingHandler->evaluate([], $stepSettings, $baseTimingState);

            if (!$timingResult->shouldPropagate || $timingResult->value !== true) {
                // DB condition failed — stop chain here, no further steps execute.
                Log::debug("[chain] Step {$stepIdx} ({$step['timing_node_id']}) failed DB check — stopping chain", [
                    'chain_root' => $chainRootNodeId,
                    'server_id'  => $serverId,
                ]);
                break;
            }

            // ── Fire this step's action ───────────────────────────────────
            if ($step['action_node_id']) {
                // Resolve the action handler type from the compiled node map — not hardcoded
                $actionNode     = $nodeMap[$step['action_node_id']] ?? null;
                $actionType     = $actionNode['type'] ?? ($step['action']['type'] ?? 'notification');
                $actionHandler  = $this->registry->get($actionType) ?? $this->registry->get('notification');
                $actionSettings = $actionNode['settings'] ?? ($step['action'] ?? []);

                $actionState = $persistedStates[$step['action_node_id']] ?? [];
                $actionState = array_merge($actionState, $context);

                $actionResult = $actionHandler->evaluate([true], $actionSettings, $actionState);
                $this->saveState($config->id, $serverId, $step['action_node_id'], $actionResult);

                if ($actionResult->shouldPropagate && $actionResult->value) {
                    // Build upstream context using this step's own node IDs (not chain root)
                    $contextSubBranch = array_merge($subBranch, [
                        'timing_node_id' => $step['timing_node_id'],
                        'action_node_id' => $step['action_node_id'],
                    ]);
                    $upstreamContext = $this->buildUpstreamContext($branch, $contextSubBranch, null);
                    $upstreamContext = array_merge($upstreamContext, $context);
                    if (isset($upstreamContext['first_trigger_timestamp'])) {
                        $firstTrigger = $upstreamContext['first_trigger_timestamp'];
                        $elapsedMs = $firstTrigger->diffInMilliseconds(now());
                        $upstreamContext['sustain_value'] = $this->formatDuration($elapsedMs);
                    }
                    $upstreamContext['repeat_count'] = $timingResult->state['repeat_count'] ?? 0;
                    $repeatInterval = $stepSettings['repeat_interval'] ?? '';
                    $upstreamContext['repeat_interval'] = $repeatInterval
                        ? $this->formatDuration(BaseNode::parseDurationToMs($repeatInterval))
                        : '';
                    $upstreamContext['repeat_max'] = (int) ($stepSettings['repeat_max_repeats'] ?? 0);

                    $actions[] = [
                        'node_id'          => $step['action_node_id'],
                        'type'             => $actionType,
                        'settings'         => $actionSettings,
                        'value'            => true,
                        'upstream_context' => $upstreamContext,
                    ];

                    // Repeat handling for the LAST step of the chain:
                    $isLastStep = !isset($chain[$stepIdx + 1]);
                    if ($isLastStep) {
                        // 1. Built-in repeat setting on the sustained node (e.g. repeat_interval="10000")
                        if ($timingResult->timer !== null) {
                            $timers[] = [
                                'node_config_id' => $config->id,
                                'node_id'        => $chainRootNodeId,
                                'delay_ms'       => $timingResult->timer->delayMs,
                                'context'        => array_merge($timingResult->timer->context, $context, [
                                    'chain_steps_meta' => $context['chain_steps_meta'] ?? null,
                                    'repeat_fire'      => true,
                                ]),
                            ];
                        }

                        // 2. Explicit post_action node connected after action (e.g. repeat node)
                        if (!empty($step['post_action'])) {
                            $postAction  = $step['post_action'];
                            $postType    = $postAction['type'] ?? 'repeat';
                            $postHandler = $this->registry->get($postType);
                            if ($postHandler) {
                                $postNodeId   = $postAction['node_id'];
                                $postSettings = $postAction['settings'] ?? [];
                                $postState    = $persistedStates[$postNodeId] ?? [];
                                $postResult   = $postHandler->evaluate([true], $postSettings, $postState);
                                $this->saveState($config->id, $serverId, $postNodeId, $postResult);

                                if ($postResult->timer !== null) {
                                    $timers[] = [
                                        'node_config_id' => $config->id,
                                        'node_id'        => $postNodeId,
                                        'delay_ms'       => $postResult->timer->delayMs,
                                        'context'        => array_merge($postResult->timer->context, $context, [
                                            'chain_steps_meta' => $context['chain_steps_meta'] ?? null,
                                            'metric_type'      => $branch['metric'],
                                        ]),
                                    ];
                                }
                            }
                        }
                    }
                }
            }
        }

        // ── Always reset state to idle so heartbeats can restart the chain ──
        $this->saveState(
            $config->id, $serverId, $chainRootNodeId,
            new NodeResult(false, false, null, ['phase' => 'idle'], [], false),
            $branch['metric'],
        );

        return ['timers' => $timers, 'actions' => $actions];
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
        if (!$this->liveConditionStillHolds($branch, $serverId)) {
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
        if (!$postHandler) {
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

        if (!$postResult->shouldPropagate && empty($postResult->outputs)) {
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
            $actionNode     = $nodeMap[$subBranch['action_node_id']] ?? null;
            $actionType     = $actionNode['type'] ?? ($subBranch['action']['type'] ?? 'notification');
            $actionHandler  = $this->registry->get($actionType) ?? $this->registry->get('notification');
            $actionSettings = $actionNode['settings'] ?? $subBranch['action'];

            $actionState = $persistedStates[$subBranch['action_node_id']] ?? [];
            $actionState = array_merge($actionState, $context);

            $actionResult = $actionHandler->evaluate([true], $actionSettings, $actionState);
            $this->saveState($config->id, $serverId, $subBranch['action_node_id'], $actionResult);

            if ($actionResult->shouldPropagate && $actionResult->value) {
                $upstreamContext = $this->buildUpstreamContext($branch, $subBranch, null);
                $upstreamContext = array_merge($upstreamContext, $context);
                $actions[] = [
                    'node_id'          => $subBranch['action_node_id'],
                    'type'             => $actionType,
                    'settings'         => $actionSettings,
                    'value'            => true,
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
        $compiler = new NodeConfigCompiler();
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

        $attributes = ['node_config_id' => $configId, 'node_id' => $scopedNodeId];
        if ($serverId !== null) {
            $attributes['server_id'] = $serverId;
        }

        $context = $result->state;
        if ($metricType !== null && !isset($context['metric_type'])) {
            $context['metric_type'] = $metricType;
        }

        NodeConfigState::updateOrCreate(
            $attributes,
            [
                'output_value' => $result->shouldPropagate ? ['value' => $result->value] : null,
                'context' => $context,
            ],
        );
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
        ];
    }

    private function formatDuration(int $ms): string
    {
        $seconds = intdiv($ms, 1000);
        if ($seconds < 60)
            return $seconds . ' second' . ($seconds !== 1 ? 's' : '');
        if ($seconds < 3600) {
            $m = intdiv($seconds, 60);
            return $m . ' minute' . ($m !== 1 ? 's' : '');
        }
        $h = intdiv($seconds, 3600);
        $m = intdiv($seconds % 3600, 60);
        if ($m > 0)
            return $h . ' hour' . ($h !== 1 ? 's' : '') . ' ' . $m . ' minute' . ($m !== 1 ? 's' : '');
        return $h . ' hour' . ($h !== 1 ? 's' : '');
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
            $agent = \App\NodeConfig\NodeTypes\Agent::where('server_id', $serverId)->first()
                ?? \App\Models\Agent::where('server_id', $serverId)->first();

            if (!$agent) {
                // No agent record at all → definitively offline
                return $sourceHandle === 'offline';
            }

            $rawOffline = (int) \App\Models\Setting::get('offline_threshold', '15');
            $offlineSec = $rawOffline >= 1000 ? intdiv($rawOffline, 1000) : ($rawOffline ?: 15);
            $isOffline = !$agent->last_seen_at ||
                $agent->last_seen_at->lt(now()->subSeconds($offlineSec));

            Log::debug('[node-config-engine] live condition check (server_status)', [
                'server_id' => $serverId,
                'is_offline' => $isOffline,
                'source_handle' => $sourceHandle,
                'holds' => $sourceHandle === 'offline' ? $isOffline : !$isOffline,
            ]);

            return $sourceHandle === 'offline' ? $isOffline : !$isOffline;
        }

        // ── metric conditions: re-check most recent sample vs threshold ──
        $condition = $branch['condition'] ?? null;
        if ($condition && isset($condition['threshold'], $condition['operator'])) {
            $agent = \App\Models\Agent::where('server_id', $serverId)->first();
            if (!$agent) {
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

            $latest = \App\Models\MetricSample::whereHas(
                'batch',
                fn($q) => $q->where('agent_id', $agent->id)
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

