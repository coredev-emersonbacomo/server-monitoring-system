<?php

namespace App\NodeConfig\Controllers;

use App\NodeConfig\Data\NodeConfigRequestData;
use App\NodeConfig\Engine\NodeRegistry;
use App\NodeConfig\Engine\NodeConfigEngine;
use App\NodeConfig\Jobs\EvaluateNodeConfig;
use App\NodeConfig\Models\NodeConfig;
use App\NodeConfig\Models\NodeConfigState;
use App\NodeConfig\Validation\NodeConfigValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;

class NodeConfigController extends Controller
{
    private NodeRegistry $registry;

    public function __construct(NodeRegistry $registry)
    {
        $this->registry = $registry;
    }

    public function index(): JsonResponse
    {
        $configs = NodeConfig::orderBy('created_at', 'desc')->get();
        return response()->json($configs);
    }

    public function store(NodeConfigRequestData $data): JsonResponse
    {
        $validator = new NodeConfigValidator();
        if (!$validator->validate($data->config->toArray())) {
            return response()->json([
                'message' => 'Invalid node config',
                'errors' => $validator->getErrors(),
            ], 422);
        }

        $config = NodeConfig::create([
            'name' => $data->name,
            'description' => $data->description ?? null,
            'config' => $data->config->toArray(),
            'created_by' => Auth::id(),
        ]);

        return response()->json($config, 201);
    }

    public function show(int $id): JsonResponse
    {
        $config = NodeConfig::findOrFail($id);
        return response()->json($config);
    }

    public function update(int $id, NodeConfigRequestData $data): JsonResponse
    {
        $config = NodeConfig::findOrFail($id);

        $validator = new NodeConfigValidator();
        if (!$validator->validate($data->config->toArray())) {
            return response()->json([
                'message' => 'Invalid node config',
                'errors' => $validator->getErrors(),
            ], 422);
        }

        $config->update([
            'name' => $data->name,
            'description' => $data->description ?? $config->description,
            'config' => $data->config->toArray(),
        ]);

        return response()->json($config);
    }

    public function destroy(int $id): JsonResponse
    {
        $config = NodeConfig::findOrFail($id);
        NodeConfigState::where('node_config_id', $id)->delete();
        $config->delete();

        return response()->json(['message' => 'Node config deleted.']);
    }

    public function test(int $id, Request $request): JsonResponse
    {
        $config = NodeConfig::findOrFail($id);

        $validated = $request->validate([
            'source_node_id' => ['required', 'string'],
            'value' => ['required'],
            'extra_state' => ['nullable', 'array'],
        ]);

        $engine = new NodeConfigEngine($this->registry);

        if (!$engine->getValidator()->validate($config->getParsedConfig())) {
            return response()->json([
                'success' => false,
                'errors' => $engine->getValidator()->getErrors(),
            ], 422);
        }

        $result = $engine->trigger(
            $config,
            $validated['source_node_id'],
            $validated['value'],
            $validated['extra_state'] ?? [],
        );

        return response()->json($result);
    }

    public function nodeTypes(): JsonResponse
    {
        return response()->json($this->registry->getDefinitions());
    }

    public function resetState(int $id): JsonResponse
    {
        $config = NodeConfig::findOrFail($id);
        NodeConfigState::where('node_config_id', $id)->delete();
        NodeConfig::cancelTasksForScope($config);
        return response()->json(['message' => 'Node config state reset.']);
    }

    private function parseSlug(string $slug): array
    {
        if (str_starts_with($slug, 'client_')) {
            return ['scope_type' => 'client', 'scope_id' => substr($slug, 7)];
        }
        if (str_starts_with($slug, 'server_')) {
            return ['scope_type' => 'server', 'scope_id' => substr($slug, 7)];
        }
        return ['scope_type' => 'global', 'scope_id' => null];
    }

    public function findBySlug(string $slug): JsonResponse
    {
        $parsed = $this->parseSlug($slug);

        $query = NodeConfig::where('scope_type', $parsed['scope_type']);
        if ($parsed['scope_id']) {
            $query->where('scope_id', $parsed['scope_id']);
        }

        $config = $query->first();

        if (!$config) {
            $config = NodeConfig::firstOrCreate(
                ['slug' => $slug],
                [
                    'scope_type' => $parsed['scope_type'],
                    'scope_id' => $parsed['scope_id'] ? (string) $parsed['scope_id'] : null,
                    'name' => '',
                    'config' => ['nodes' => [], 'edges' => []],
                    'created_by' => Auth::id(),
                ],
            );
        }

        if (in_array($config->scope_type, ['client', 'server']) && empty($config->config['nodes'] ?? [])) {
            $globalConfig = NodeConfig::where('scope_type', 'global')->first();
            if ($globalConfig && !empty($globalConfig->config['nodes'] ?? [])) {
                $config->update(['config' => $globalConfig->config]);
            }
        }

        return response()->json($config);
    }

    public function upsertBySlug(string $slug, Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'config' => ['required', 'array'],
            'config.nodes' => ['nullable', 'array'],
            'config.edges' => ['nullable', 'array'],
        ]);

        $validator = new NodeConfigValidator();
        if (!$validator->validate($data['config'])) {
            return response()->json([
                'message' => 'Invalid node config',
                'errors' => $validator->getErrors(),
            ], 422);
        }

        $parsed = $this->parseSlug($slug);

        $query = NodeConfig::where('scope_type', $parsed['scope_type']);
        if ($parsed['scope_id']) {
            $query->where('scope_id', $parsed['scope_id']);
        }

        $config = $query->first();

        if ($config) {
            $config->update([
                'name' => $data['name'],
                'config' => $data['config'],
            ]);
        } else {
            $config = NodeConfig::create([
                'slug' => $slug,
                'name' => $data['name'],
                'config' => $data['config'],
                'scope_type' => $parsed['scope_type'],
                'scope_id' => $parsed['scope_id'],
                'created_by' => Auth::id(),
            ]);
        }

        return response()->json($config);
    }

    public function preview(Request $request): JsonResponse
    {
        $data = $request->validate([
            'config' => ['required', 'array'],
            'config.nodes' => ['required', 'array'],
            'config.edges' => ['required', 'array'],
        ]);

        $compiler = new \App\NodeConfig\Engine\NodeConfigCompiler();
        $compiled = $compiler->compile($data['config']);

        return response()->json($compiled);
    }

    public function telemetryState(): JsonResponse
    {
        $activeTasks = \App\NodeConfig\Engine\NodeTaskScheduler::getAllActiveTasks();
        $states = NodeConfigState::all();
        $serverNow = microtime(true);

        // Real last sweep time anchored from cache (set by SystemMonitor command)
        $lastSweepAt = \Illuminate\Support\Facades\Cache::get('last_monitor_sweep_at');

        $snapshot = [
            'server_now'               => $serverNow,
            'active_tasks'             => array_values($activeTasks),
            'states'                   => $states,
            'last_monitor_sweep_at'    => $lastSweepAt,   // microtime float or null
            'monitor_interval_seconds' => 60,             // everyMinute() in console.php
        ];

        // Broadcast a trimmed snapshot — omit heavy context blobs to stay under
        // Pusher/Reverb's 10 KB per-message limit. The HTTP response keeps full data.
        $broadcastStates = $states->map(fn($s) => [
            'node_id'      => $s->node_id,
            'server_id'    => $s->server_id,
            'output_value' => $s->output_value,
        ])->values();

        $broadcastTasks = array_values(array_map(fn($t) => [
            'task_id'    => $t['task_id'],
            'node_id'    => $t['node_id'],
            'server_id'  => $t['server_id'],
            'fire_at'    => $t['fire_at'],
            'delay_ms'   => $t['delay_ms'],
            'live_stats' => $t['live_stats'] ?? null,
            'context'    => [
                'chain_steps_meta' => $t['context']['chain_steps_meta'] ?? null,
                'repeat_count'     => $t['context']['repeat_count'] ?? 0,
                'repeat_fire'      => $t['context']['repeat_fire'] ?? false,
                'metric_type'      => $t['context']['metric_type'] ?? null,
            ],
        ], $activeTasks));

        \App\Events\SystemTelemetryEvent::emit('state_snapshot', [
            'server_now'               => $serverNow,
            'active_tasks'             => $broadcastTasks,
            'states'                   => $broadcastStates,
            'last_monitor_sweep_at'    => $lastSweepAt,
            'monitor_interval_seconds' => 60,
        ]);

        return response()->json($snapshot);
    }
}

