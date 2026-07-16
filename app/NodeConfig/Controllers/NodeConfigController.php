<?php

namespace App\NodeConfig\Controllers;

use App\NodeConfig\Data\NodeConfigRequestData;
use App\NodeConfig\Engine\NodeRegistry;
use App\NodeConfig\Engine\NodeConfigEngine;
use App\NodeConfig\Engine\NodeConfigCompiler;
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

    public function findBySlug(string $slug): JsonResponse
    {
        $config = NodeConfig::where('slug', $slug)->first();

        if (!$config) {
            return response()->json([
                'nodes' => [],
                'edges' => [],
                'name' => '',
                'slug' => $slug,
                'enabled' => true,
            ]);
        }

        return response()->json($config);
    }

    public function upsertBySlug(string $slug, Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'config' => ['required', 'array'],
            'config.nodes' => ['required', 'array'],
            'config.edges' => ['required', 'array'],
            'enabled' => ['nullable', 'boolean'],
        ]);

        $validator = new NodeConfigValidator();
        if (!$validator->validate($data['config'])) {
            return response()->json([
                'message' => 'Invalid node config',
                'errors' => $validator->getErrors(),
            ], 422);
        }

        $compiler = new NodeConfigCompiler();
        $compiledConfig = $compiler->compile($data['config']);

        $config = NodeConfig::where('slug', $slug)->first();

        if ($config) {
            $config->update([
                'name' => $data['name'],
                'config' => $data['config'],
                'compiled_config' => $compiledConfig,
                'enabled' => $data['enabled'] ?? $config->enabled,
            ]);
        } else {
            $config = NodeConfig::create([
                'slug' => $slug,
                'name' => $data['name'],
                'config' => $data['config'],
                'compiled_config' => $compiledConfig,
                'enabled' => $data['enabled'] ?? true,
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

        $compiler = new NodeConfigCompiler();
        $compiled = $compiler->compile($data['config']);

        return response()->json($compiled);
    }

    public function resolved(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'server_id' => ['required', 'string'],
        ]);

        $config = NodeConfig::resolveForServer($validated['server_id']);

        if (!$config) {
            return response()->json([
                'nodes' => [],
                'edges' => [],
                'name' => '',
                'scope_type' => 'global',
                'scope_id' => null,
                'enabled' => true,
            ]);
        }

        return response()->json($config);
    }

    public function scoped(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'scope_type' => ['required', 'string', 'in:global,client,server'],
            'scope_id' => ['nullable', 'string'],
        ]);

        $query = NodeConfig::where('scope_type', $validated['scope_type']);

        if ($validated['scope_type'] !== 'global') {
            $query->where('scope_id', $validated['scope_id']);
        }

        $config = $query->first();

        if (!$config) {
            return response()->json([
                'nodes' => [],
                'edges' => [],
                'name' => '',
                'scope_type' => $validated['scope_type'],
                'scope_id' => $validated['scope_id'] ?? null,
                'enabled' => true,
            ]);
        }

        return response()->json($config);
    }

    public function upsertScoped(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'config' => ['required', 'array'],
            'config.nodes' => ['required', 'array'],
            'config.edges' => ['required', 'array'],
            'scope_type' => ['required', 'string', 'in:global,client,server'],
            'scope_id' => ['nullable', 'string'],
            'enabled' => ['nullable', 'boolean'],
        ]);

        $validator = new NodeConfigValidator();
        if (!$validator->validate($data['config'])) {
            return response()->json([
                'message' => 'Invalid node config',
                'errors' => $validator->getErrors(),
            ], 422);
        }

        $compiler = new NodeConfigCompiler();
        $compiledConfig = $compiler->compile($data['config']);

        $query = NodeConfig::where('scope_type', $data['scope_type']);
        if ($data['scope_type'] !== 'global') {
            $query->where('scope_id', $data['scope_id']);
        }

        $config = $query->first();

        if ($config) {
            $config->update([
                'name' => $data['name'],
                'config' => $data['config'],
                'compiled_config' => $compiledConfig,
                'enabled' => $data['enabled'] ?? $config->enabled,
            ]);
        } else {
            $config = NodeConfig::create([
                'name' => $data['name'],
                'slug' => $data['scope_type'] === 'global' ? 'alerts' : null,
                'config' => $data['config'],
                'compiled_config' => $compiledConfig,
                'scope_type' => $data['scope_type'],
                'scope_id' => $data['scope_id'] ?? null,
                'enabled' => $data['enabled'] ?? true,
                'created_by' => Auth::id(),
            ]);
        }

        return response()->json($config);
    }
}
