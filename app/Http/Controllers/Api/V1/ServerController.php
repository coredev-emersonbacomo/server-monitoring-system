<?php

namespace App\Http\Controllers\Api\V1;

use App\Data\CreateServerData;
use App\Data\ServerData;
use App\Data\ServerDataRequest;
use App\Data\StatPointData;
use App\Data\UpdateServerData;
use App\Events\AgentConfigUpdated;
use App\Events\ServerStatusUpdated;
use App\Http\Controllers\Controller;
use App\Models\ActionItem;
use App\Models\Client;
use App\Models\CustomActivityLog;
use App\Models\Server;
use App\Models\ServerUpdate;
use App\Models\Setting;
use App\NodeConfig\Engine\NodeTaskScheduler;
use App\NodeConfig\Models\NodeConfigState;
use App\NodeConfig\Services\NodeConfigService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Spatie\LaravelData\Optional;

class ServerController extends Controller
{
    public function index(string $clientUuid)
    {
        $clientModel = Client::where('uuid', $clientUuid)->firstOrFail();
        $servers = Server::withTrashed()->where('client_id', $clientModel->id)->get();
        foreach ($servers as $s) {
            $s->checkTokenExpiration();
        }

        return ServerData::collect($servers->map(fn (Server $s) => ServerData::fromModel($s)));
    }

    public function store(CreateServerData $data, string $clientUuid): ServerData
    {
        $clientModel = Client::where('uuid', $clientUuid)->firstOrFail();
        $clientId = $clientModel->id;

        try {
            $server = Server::create([
                'client_id' => $clientId,
                'name' => $data->name,
                'description' => $data->description,
                'host_name' => $data->host_name ?? $data->name,
                'subscription_fee' => $data->subscription_fee ?? 0.0,
            ]);

            $actor = auth()->user();

            CustomActivityLog::create([
                'logable_type' => Server::class,
                'logable_id' => (string) $server->uuid,
                'user_id' => $actor?->id,
                'user' => $actor ? "{$actor->first_name} {$actor->last_name}" : 'System',
                'action' => 'Create Server',
                'details' => [
                    'message' => "Create server: {$server->name}",
                    'name' => $server->name,
                    'host_name' => $server->host_name,
                    'client_uuid' => $clientModel->uuid,
                    'client_name' => $clientModel->name,
                    'subscription_fee' => $server->subscription_fee,
                ],
            ]);

            // Sync client's stored total_subscription_fee
            $clientModel->update([
                'total_subscription_fee' => (float) $clientModel->servers()->sum('subscription_fee'),
            ]);

            return ServerData::fromModel($server);
        } catch (\RuntimeException $e) {
            abort(500, 'Installation failed: '.$e->getMessage());
        }
    }

    public function show(string $clientUuid, string $serverUuid): ServerData
    {
        $serverModel = Server::withTrashed()
            ->where('uuid', $serverUuid)
            ->whereHas('client', fn ($q) => $q->where('uuid', $clientUuid))
            ->firstOrFail();

        return ServerData::fromModel($serverModel);
    }

    public function updateAlertScope(Request $request, string $clientUuid, string $serverUuid)
    {
        $request->validate([
            'alert_scope' => ['required', 'string', 'in:global,client,server'],
        ]);

        $serverModel = Server::withTrashed()
            ->where('uuid', $serverUuid)
            ->whereHas('client', fn ($q) => $q->where('uuid', $clientUuid))
            ->firstOrFail();

        $newScope = $request->input('alert_scope');

        if ($newScope !== 'global') {
            $scopeType = $newScope;
            $targetSlug = $scopeType === 'server'
                ? "server_{$serverModel->uuid}"
                : "client_{$serverModel->client->uuid}";
            app(NodeConfigService::class)
                ->copyGlobalConfigIfNeeded($scopeType, $targetSlug);
        }

        $serverModel->update(['alert_scope' => $newScope]);

        $store = Cache::store(config('cache.default', 'file'));
        $store->forget('node_config:scope:server:'.$serverModel->uuid);

        // Cancel all in-flight tasks and purge stale state rows so the new config
        // starts clean — old branch latches / action_dispatched flags must not bleed across.
        NodeTaskScheduler::cancelByServer($serverModel->id);
        NodeConfigState::where('server_id', $serverModel->id)->delete();
    }

    public function update(UpdateServerData $data, string $clientUuid, string $serverUuid): ServerData
    {
        $serverModel = Server::withTrashed()
            ->where('uuid', $serverUuid)
            ->whereHas('client', fn ($q) => $q->where('uuid', $clientUuid))
            ->firstOrFail();

        $updatePayload = [];

        if ($data->name !== null && ! ($data->name instanceof Optional)) {
            $updatePayload['name'] = $data->name;
        }

        if ($data->description !== null && ! ($data->description instanceof Optional)) {
            $updatePayload['description'] = $data->description;
        }

        if (! ($data->subscription_fee instanceof Optional) && $data->subscription_fee !== null) {
            $newRate = (float) $data->subscription_fee;
            $oldRate = (float) ($serverModel->subscription_fee ?? 0.0);
            if (abs($newRate - $oldRate) > 0.0001) {
                $updatePayload['subscription_fee'] = $newRate;
            }
        }

        $originalAttributes = $serverModel->getRawOriginal();

        if (! empty($updatePayload)) {
            $serverModel->update($updatePayload);
        }

        $actor = auth()->user();
        $actorName = $actor ? "{$actor->first_name} {$actor->last_name}" : 'System';

        if (isset($updatePayload['subscription_fee'])) {
            $oldRateFmt = number_format((float) ($originalAttributes['subscription_fee'] ?? 0.0), 2);
            $newRateFmt = number_format((float) $updatePayload['subscription_fee'], 2);

            CustomActivityLog::create([
                'logable_type' => Server::class,
                'logable_id' => (string) $serverModel->uuid,
                'user_id' => $actor?->id,
                'user' => $actorName,
                'action' => 'Update Subscription Fee',
                'details' => [
                    'message' => "Subscription fee updated from ₱{$oldRateFmt}/mo to ₱{$newRateFmt}/mo for server: {$serverModel->name}",
                    'server_name' => $serverModel->name,
                    'before' => ['subscription_fee' => (float) ($originalAttributes['subscription_fee'] ?? 0.0)],
                    'after' => ['subscription_fee' => (float) $updatePayload['subscription_fee']],
                ],
            ]);
        } elseif ($serverModel->wasChanged()) {
            $changes = $serverModel->getChanges();
            unset($changes['updated_at']);

            $before = [];
            $after = [];
            foreach (array_keys($changes) as $field) {
                $before[$field] = $originalAttributes[$field] ?? null;
                $after[$field] = $serverModel->{$field};
            }

            CustomActivityLog::create([
                'logable_type' => Server::class,
                'logable_id' => (string) $serverModel->uuid,
                'user_id' => $actor?->id,
                'user' => $actorName,
                'action' => 'Update Server',
                'details' => [
                    'message' => "Updated server: {$serverModel->name}",
                    'before' => $before,
                    'after' => $after,
                ],
            ]);
        }

        ServerStatusUpdated::dispatch(
            $serverModel->uuid,
            $serverModel->status ?? 'online',
            $serverModel->name
        );

        // Sync client's stored total_subscription_fee whenever any server field changes
        if ($serverModel->client) {
            $serverModel->client->update([
                'total_subscription_fee' => (float) $serverModel->client->servers()->sum('subscription_fee'),
            ]);
        }

        return ServerData::fromModel($serverModel);
    }

    public function adjustCost(Request $request, string $clientUuid, string $serverUuid): ServerData
    {
        $request->validate([
            'action' => ['required', 'string', 'in:deduction,add_funds,add_credit,reset_usage'],
            'amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $serverModel = Server::where('uuid', $serverUuid)
            ->whereHas('client', fn ($q) => $q->where('uuid', $clientUuid))
            ->firstOrFail();

        $actor = auth()->user();
        $actorName = $actor ? "{$actor->first_name} {$actor->last_name}" : 'System';
        $actionType = $request->input('action');
        $amount = (float) ($request->input('amount') ?? 0.0);

        if ($actionType === 'reset_usage') {
            $serverModel->update([
                'online_seconds' => 0,
            ]);

            CustomActivityLog::create([
                'type' => 'billing',
                'logable_type' => Server::class,
                'logable_id' => (string) $serverModel->uuid,
                'user_id' => $actor?->id,
                'user' => $actorName,
                'action' => 'Reset Cost Baseline',
                'details' => [
                    'message' => "Reset cost usage & baseline for server: {$serverModel->name}",
                    'server_name' => $serverModel->name,
                ],
            ]);
        } else {
            $newOffset = (float) $serverModel->remitted + $amount;
            $serverModel->update([
                'remitted' => $newOffset,
            ]);

            $formatted = number_format($amount, 2);

            CustomActivityLog::create([
                'type' => 'billing',
                'logable_type' => Server::class,
                'logable_id' => (string) $serverModel->uuid,
                'user_id' => $actor?->id,
                'user' => $actorName,
                'action' => 'Deduction',
                'details' => [
                    'message' => "Payment deduction of ₱{$formatted} applied to server: {$serverModel->name}",
                    'payment_amount' => $amount,
                    'total_payments' => $newOffset,
                    'server_name' => $serverModel->name,
                ],
            ]);
        }

        ServerStatusUpdated::dispatch(
            $serverModel->uuid,
            $serverModel->status ?? 'online',
            $serverModel->name
        );

        return ServerData::fromModel($serverModel->fresh());
    }

    public function destroy(string $clientUuid, string $serverUuid)
    {
        $serverModel = Server::where('uuid', $serverUuid)
            ->whereHas('client', fn ($q) => $q->where('uuid', $clientUuid))
            ->firstOrFail();

        if ($serverModel->agent()->whereNotNull('registered_at')->exists() && ! $serverModel->agent_deleted) {
            return response()->json([
                'message' => 'Cannot delete server while the agent is still running. Please run the uninstall script first.',
            ], 422);
        }

        $actor = auth()->user();

        CustomActivityLog::create([
            'logable_type' => Server::class,
            'logable_id' => (string) $serverModel->uuid,
            'user_id' => $actor?->id,
            'user' => $actor ? "{$actor->first_name} {$actor->last_name}" : 'System',
            'action' => 'Archive Server',
            'details' => [
                'message' => "Archived server: {$serverModel->name}",
                'name' => $serverModel->name,
                'host_name' => $serverModel->host_name,
            ],
        ]);

        ActionItem::where('server_id', $serverModel->id)->delete();

        $serverModel->update([
            'record_status' => 'archived',
            'status' => 'archived',
        ]);
        $serverModel->delete();

        // Sync client's stored total_subscription_fee after server removal
        $clientModel = Client::where('uuid', $clientUuid)->first();
        if ($clientModel) {
            $clientModel->update([
                'total_subscription_fee' => (float) $clientModel->servers()->sum('subscription_fee'),
            ]);
        }

        return response()->json(['status' => 'success']);
    }

    public function listAll(Request $request)
    {
        $query = Server::withTrashed()->with('client', 'latestUpdate', 'agent');

        if ($clientUuid = $request->query('client_uuid')) {
            $client = Client::where('uuid', $clientUuid)->first();
            if ($client) {
                $query->where('client_id', $client->id);
            }
        }

        $servers = $query->orderBy('created_at', 'desc')->get();

        foreach ($servers as $server) {
            $server->checkTokenExpiration();
        }

        return ServerData::collect($servers->map(fn (Server $s) => ServerData::fromModel($s)));
    }

    public function showWithStats(string $serverUuid, ServerDataRequest $requestData): ServerData
    {
        $server = Server::withTrashed()->where('uuid', $serverUuid)->first();
        if (! $server) {
            abort(404, 'Server not found.');
        }

        $server->checkTokenExpiration();

        $tableUnit = $requestData->getTableUnits();
        $subTime = $requestData->getStartFromDatetime();
        $endTime = $requestData->getEndToDatetime();

        $updates = $this->getData($server->id, $tableUnit, $subTime, $endTime);

        $stats = $updates->map(
            fn ($row) => StatPointData::from(self::computeStatPointFromAgg($row, $tableUnit))
        )->values()->all();

        $data = ServerData::fromModel($server);
        $data->stats = $stats;

        return $data;
    }

    public static function computeStatPointPublic(ServerUpdate $row, ?ServerUpdate $prev): array
    {
        $ts = $row->created_at->getPreciseTimestamp(3);

        $netIn = 0;
        $netOut = 0;
        if ($prev) {
            $prevTs = $prev->created_at->getPreciseTimestamp(3);
            $dt = ($ts - $prevTs) / 1000;
            if ($dt > 0) {
                $netIn = (($row->netIn - $prev->netIn) / 1_000_000) / $dt;
                $netOut = (($row->netOut - $prev->netOut) / 1_000_000) / $dt;
            }
        }

        return [
            'timestamp' => $ts,
            'cpu' => round((float) $row->cpu_usage, 1),
            'memory' => round((float) $row->memory_usage, 1),
            'netIn' => round($netIn, 2),
            'netOut' => round($netOut, 2),
            'disk' => round((float) $row->storage, 1),
        ];
    }

    /**
     * Save the SecOps monitoring filter for a server. A null filter means
     * "monitor everything the agent's built-in noise filter allows"; a list is
     * the exact set of ports/processes that matter for this server. The agent
     * picks this up on its next auth/heartbeat and applies it in memory.
     */
    public function updateMonitoringConfig(Request $request, string $clientUuid, string $serverUuid): ServerData
    {
        $request->validate([
            'port_filter' => ['nullable', 'array'],
            'port_filter.*' => ['integer', 'between:1,65535'],
            'process_filter' => ['nullable', 'array'],
            'process_filter.*' => ['string', 'max:255'],
        ]);

        $serverModel = Server::withTrashed()
            ->where('uuid', $serverUuid)
            ->whereHas('client', fn ($q) => $q->where('uuid', $clientUuid))
            ->firstOrFail();

        $update = [];
        foreach (['port_filter', 'process_filter'] as $field) {
            if (! $request->exists($field)) {
                continue;
            }
            $value = $request->input($field);
            if ($value === null) {
                // Explicit null = reset to "monitor everything noise-filtered".
                $update[$field] = null;
            } else {
                $update[$field] = $field === 'port_filter'
                    ? array_values(array_unique(array_map('intval', $value)))
                    : array_values(array_unique($value));
            }
        }

        $serverModel->update($update);

        // Push the new filter to the agent over the WS control channel. The
        // heartbeat response no longer carries the per-server config (it only
        // returns on auth/startup and on change), so the socket is the delivery
        // mechanism for filter updates.
        if ($agent = $serverModel->agent) {
            $currentConfig = $agent->currentConfiguration;
            event(new AgentConfigUpdated(
                $serverUuid,
                $currentConfig?->heartbeat_interval ?? (int) Setting::get('heartbeat_interval', 5),
                'config_update',
                '',
                '',
                $serverModel->port_filter,
                $serverModel->process_filter,
            ));
        }

        return ServerData::fromModel($serverModel);
    }

    public static function computeStatPointFromAgg(object $row, string $tableUnit): array
    {
        $bucketSeconds = match (true) {
            str_contains($tableUnit, 'minute') => 60,
            str_contains($tableUnit, 'hour') => 3600,
            str_contains($tableUnit, 'day') => 86400,
            str_contains($tableUnit, 'week') => 604800,
            str_contains($tableUnit, 'month') => 2592000,
            default => 60,
        };

        $epochMs = Carbon::parse($row->timestamp)->getPreciseTimestamp(3);

        return [
            'timestamp' => $epochMs,
            'cpu' => round((float) $row->cpu, 1),
            'memory' => round((float) $row->memory, 1),
            'disk' => round((float) $row->disk, 1),
            'netIn' => round(((float) $row->netIn / 1_000_000) / $bucketSeconds, 2),
            'netOut' => round(((float) $row->netOut / 1_000_000) / $bucketSeconds, 2),
        ];
    }

    public function getData(int $serverId, string $tableUnit, Carbon $subTime, ?Carbon $endTime = null): Collection
    {
        try {
            return $this->queryAggTable($serverId, $tableUnit, $subTime, $endTime);
        } catch (\Throwable $e) {
            if (str_contains($e->getMessage(), 'has not been populated')) {
                DB::statement("REFRESH MATERIALIZED VIEW {$tableUnit}");

                return $this->queryAggTable($serverId, $tableUnit, $subTime, $endTime);
            }
            throw $e;
        }
    }

    private function queryAggTable(int $serverId, string $tableUnit, Carbon $subTime, ?Carbon $endTime = null): Collection
    {
        $query = DB::table($tableUnit)
            ->selectRaw('timestamp, cpu, memory, disk, netin as "netIn", netout as "netOut"')
            ->where('server_id', $serverId)
            ->where('timestamp', '>=', $subTime);

        if ($endTime) {
            $query->where('timestamp', '<=', $endTime);
        }

        return $query->orderBy('timestamp')->get();
    }
}
