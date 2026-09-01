<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ServerStatus;
use App\Events\AgentLifecycleCreated;
use App\Events\FileActivityCreated;
use App\Http\Controllers\Controller;
use App\Http\Resources\AgentLifecycleEventResource;
use App\Http\Resources\FileActivityLogResource;
use App\Models\Agent;
use App\Models\AgentLifecycleEvent;
use App\Models\FileActivityLog;
use App\Models\Server;
use App\Services\AgentAuthService;
use App\Services\HybridPaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AuditController extends Controller
{
    public function __construct(
        private AgentAuthService $agentAuthService,
        private HybridPaginator $hybridPaginator,
    ) {}

    /**
     * Agent-ingested bulk file-activity events. Agent-authenticated (signed
     * session); each event carries a stable uuid for idempotent ingestion.
     */
    public function ingestFileActivity(Request $request): JsonResponse
    {
        $agent = $this->agentAuthService->authenticate($request);
        if (! $agent) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($agent->revoked_at) {
            return response()->json(['message' => 'Agent has been decommissioned.'], 403);
        }

        $validated = $request->validate([
            'events' => ['required', 'array', 'min:1'],
            'events.*.uuid' => ['required', 'string', 'max:64'],
            'events.*.server_uuid' => ['nullable', 'string'],
            'events.*.action' => ['required', 'string', 'in:created,modified,moved,renamed,deleted'],
            'events.*.file_name' => ['required', 'string', 'max:2048'],
            'events.*.source_path' => ['required', 'string', 'max:4096'],
            'events.*.destination_path' => ['nullable', 'string', 'max:4096'],
            'events.*.is_directory' => ['nullable', 'boolean'],
            'events.*.username' => ['nullable', 'string', 'max:512'],
            'events.*.process_name' => ['nullable', 'string', 'max:512'],
            'events.*.process_id' => ['nullable', 'integer'],
            'events.*.occurred_at' => ['required', 'string'],
        ]);

        $inserted = 0;
        $skipped = 0;

        // Resolve + validate server ownership once per distinct server_uuid.
        $serverByUuid = $this->resolveOwnedServers($agent, $validated['events']);

        $knownUuids = FileActivityLog::whereIn('uuid', collect($validated['events'])->pluck('uuid'))
            ->pluck('uuid')
            ->all();
        $knownUuids = array_flip($knownUuids);

        $created = [];

        DB::transaction(function () use ($validated, $agent, $serverByUuid, $knownUuids, &$inserted, &$skipped, &$created) {
            foreach ($validated['events'] as $event) {
                if (isset($knownUuids[$event['uuid']])) {
                    $skipped++;

                    continue;
                }

                $serverUuid = $event['server_uuid'] ?? null;
                $serverId = $serverUuid !== null
                    ? ($serverByUuid[$serverUuid] ?? null)
                    : null;

                if ($serverUuid !== null && $serverId === null) {
                    // Ownership/association mismatch: never attach to the wrong server.
                    $skipped++;

                    continue;
                }

                // Agent sends UTC RFC3339 (e.g. 2026-09-01T05:36:44Z). Store as UTC.
                $occurredAt = Carbon::parse($event['occurred_at'])->utc();

                $created[] = FileActivityLog::create([
                    'uuid' => $event['uuid'],
                    'server_id' => $serverId,
                    'agent_id' => $agent->id,
                    'action' => $event['action'],
                    'file_name' => $event['file_name'],
                    'source_path' => $event['source_path'],
                    'destination_path' => $event['destination_path'] ?? null,
                    'is_directory' => (bool) ($event['is_directory'] ?? false),
                    'username' => $event['username'] ?? null,
                    'process_name' => $event['process_name'] ?? null,
                    'process_id' => $event['process_id'] ?? null,
                    'occurred_at' => $occurredAt,
                ]);

                $inserted++;
            }
        });

        foreach ($created as $log) {
            try {
                FileActivityCreated::dispatch($log);
            } catch (\Throwable $e) {
                Log::warning('[broadcast] FileActivityCreated failed: '.$e->getMessage());
            }
        }

        return response()->json(['inserted' => $inserted, 'skipped' => $skipped], 200);
    }

    /**
     * Agent-ingested lifecycle events. Agent-authenticated; idempotent by uuid.
     */
    public function ingestLifecycle(Request $request): JsonResponse
    {
        $agent = $this->agentAuthService->authenticate($request);
        if (! $agent) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($agent->revoked_at) {
            return response()->json(['message' => 'Agent has been decommissioned.'], 403);
        }

        $validated = $request->validate([
            'events' => ['required', 'array', 'min:1'],
            'events.*.uuid' => ['required', 'string', 'max:64'],
            'events.*.event_type' => ['required', 'string', 'in:started,stopping,stopped,unexpectedly_disconnected'],
            'events.*.server_uuid' => ['nullable', 'string'],
            'events.*.occurred_at' => ['required', 'string'],
        ]);

        $inserted = 0;
        $skipped = 0;

        $serverByUuid = $this->resolveOwnedServers($agent, $validated['events']);

        $knownUuids = AgentLifecycleEvent::whereIn('uuid', collect($validated['events'])->pluck('uuid'))
            ->pluck('uuid')
            ->all();
        $knownUuids = array_flip($knownUuids);

        $created = [];

        DB::transaction(function () use ($validated, $agent, $serverByUuid, $knownUuids, &$inserted, &$skipped, &$created) {
            foreach ($validated['events'] as $event) {
                if (isset($knownUuids[$event['uuid']])) {
                    $skipped++;

                    continue;
                }

                $serverId = ($event['server_uuid'] ?? null) !== null
                    ? ($serverByUuid[$event['server_uuid']] ?? null)
                    : null;

                if (($event['server_uuid'] ?? null) !== null && $serverId === null) {
                    $skipped++;

                    continue;
                }

                $occurredAt = Carbon::parse($event['occurred_at'])->utc();

                $created[] = AgentLifecycleEvent::create([
                    'uuid' => $event['uuid'],
                    'server_id' => $serverId,
                    'agent_id' => $agent->id,
                    'event_type' => $event['event_type'],
                    'occurred_at' => $occurredAt,
                ]);

                $inserted++;
            }
        });

        foreach ($created as $ev) {
            try {
                AgentLifecycleCreated::dispatch($ev);
            } catch (\Throwable $e) {
                Log::warning('[broadcast] AgentLifecycleCreated failed: '.$e->getMessage());
            }
        }

        return response()->json(['inserted' => $inserted, 'skipped' => $skipped], 200);
    }

    /**
     * Map distinct server_uuids in the payload to server ids the agent owns.
     * A uuid the agent does not own is excluded (caller must skip the event).
     */
    private function resolveOwnedServers(Agent $agent, array $events): array
    {
        $uuids = collect($events)
            ->pluck('server_uuid')
            ->filter()
            ->unique()
            ->values()
            ->all();

        if (empty($uuids)) {
            return [];
        }

        return Server::whereIn('uuid', $uuids)
            ->where('agent_id', $agent->id)
            ->where('agent_deleted', false)
            ->where('status', '!=', ServerStatus::Archived->value)
            ->pluck('id', 'uuid')
            ->all();
    }

    // ---------------------------------------------------------------------
    // JWT Logs API
    // ---------------------------------------------------------------------

    public function fileActivity(Request $request): JsonResponse
    {
        $request->validate([
            'server_id' => ['nullable', 'integer'],
            'server_uuid' => ['nullable', 'string'],
            'agent_id' => ['nullable', 'integer'],
            'action' => ['nullable', 'string', 'in:created,modified,moved,renamed,deleted'],
            'path' => ['nullable', 'string'],
            'occurred_at_from' => ['nullable', 'string'],
            'occurred_at_to' => ['nullable', 'string'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        $query = FileActivityLog::query()->with(['server', 'agent', 'agent.monitoredServers']);

        $this->applyServerFilter($query, $request);
        $this->applyDateFilter($query, $request, 'occurred_at');

        if ($request->filled('agent_id')) {
            $query->where('agent_id', $request->integer('agent_id'));
        }
        if ($request->filled('action')) {
            $query->where('action', $request->string('action'));
        }
        if ($request->filled('path')) {
            $like = '%'.$request->string('path').'%';
            $query->where(function ($q) use ($like) {
                $q->where('source_path', 'like', $like)
                    ->orWhere('destination_path', 'like', $like);
            });
        }

        // Default to page mode so the UI shows total pages like the other log tabs.
        // HybridPaginator defaults to cursor when no page/cursor is given, which
        // renders as "1 / ?" and breaks the shared PaginationControls expectation
        // for these tabs. Jump-to-page still works via ?page=N.
        if (! $request->filled('page') && ! $request->filled('cursor') && ! $request->filled('previous_cursor')) {
            $request->merge(['page' => '1']);
        }

        $results = $this->hybridPaginator->paginate($query, $request);

        return response()->json([
            'data' => $results['items']->map(
                fn ($log) => (new FileActivityLogResource($log))->resolve($request)
            )->all(),
            'meta' => ['pagination' => $results['pagination']],
        ]);
    }

    public function agentLifecycle(Request $request): JsonResponse
    {
        $request->validate([
            'server_id' => ['nullable', 'integer'],
            'server_uuid' => ['nullable', 'string'],
            'agent_id' => ['nullable', 'integer'],
            'event_type' => ['nullable', 'string', 'in:started,stopping,stopped,unexpectedly_disconnected'],
            'occurred_at_from' => ['nullable', 'string'],
            'occurred_at_to' => ['nullable', 'string'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        $query = AgentLifecycleEvent::query()->with(['server', 'agent', 'agent.monitoredServers']);

        $this->applyServerFilter($query, $request);
        $this->applyDateFilter($query, $request, 'occurred_at');

        if ($request->filled('agent_id')) {
            $query->where('agent_id', $request->integer('agent_id'));
        }
        if ($request->filled('event_type')) {
            $query->where('event_type', $request->string('event_type'));
        }

        if (! $request->filled('page') && ! $request->filled('cursor') && ! $request->filled('previous_cursor')) {
            $request->merge(['page' => '1']);
        }

        $results = $this->hybridPaginator->paginate($query, $request);

        return response()->json([
            'data' => $results['items']->map(
                fn ($log) => (new AgentLifecycleEventResource($log))->resolve($request)
            )->all(),
            'meta' => ['pagination' => $results['pagination']],
        ]);
    }

    private function applyServerFilter($query, Request $request): void
    {
        if ($request->filled('server_id')) {
            $query->where('server_id', $request->integer('server_id'));
        } elseif ($request->filled('server_uuid')) {
            $server = Server::where('uuid', $request->string('server_uuid'))->first();
            if (! $server) {
                $query->where('server_id', -1);

                return;
            }
            // Include agent-scoped rows (server_id IS NULL) for this agent so
            // the Agent tab shows file activity that is not bound to a single
            // server (e.g. %ProgramData%\MonitorAgent watches).
            $query->where(function ($q) use ($server) {
                $q->where('server_id', $server->id);
                if ($server->agent_id) {
                    $q->orWhere(function ($qq) use ($server) {
                        $qq->whereNull('server_id')->where('agent_id', $server->agent_id);
                    });
                }
            });
        }
    }

    private function applyDateFilter($query, Request $request, string $column): void
    {
        if ($request->filled('occurred_at_from')) {
            $query->where($column, '>=', $request->string('occurred_at_from'));
        }
        if ($request->filled('occurred_at_to')) {
            $query->where($column, '<=', $request->string('occurred_at_to'));
        }
    }
}
