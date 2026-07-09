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
            'enabled' => $data->enabled ?? true,
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
            'enabled' => $data->enabled ?? $config->enabled,
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

    public function toggle(int $id): JsonResponse
    {
        $config = NodeConfig::findOrFail($id);
        $config->update(['enabled' => !$config->enabled]);

        return response()->json($config);
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
        NodeConfigState::where('node_config_id', $id)->delete();
        return response()->json(['message' => 'Node config state reset.']);
    }
}
