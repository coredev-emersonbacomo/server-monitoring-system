<?php

namespace App\Http\Controllers\Api\V1;

use App\Data\CreateServerData;
use App\Data\CustomActivityLogData;
use App\Data\ServerData;
use App\Data\StatPointData;
use App\Data\UpdateServerData;
use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Server;
use App\Models\ServerUpdate;
use App\Models\ActionItem;
use App\Models\CustomActivityLog;
use Dedoc\Scramble\Attributes\QueryParameter;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ServerController extends Controller
{
    public function index(string $clientUuid)
    {
        $clientModel = Client::where('uuid', $clientUuid)->firstOrFail();
        $servers = Server::withTrashed()->where('client_id', $clientModel->id)->get();
        foreach ($servers as $s) {
            $s->checkTokenExpiration();
        }
        return ServerData::collect($servers->map(fn(Server $s) => ServerData::fromModel($s)));
    }

    public function store(CreateServerData $data, string $clientUuid): ServerData
    {
        $clientModel = Client::where('uuid', $clientUuid)->firstOrFail();
        $clientId = $clientModel->id;

        try {
            $server = Server::create([
                'client_id'    => $clientId,
                'name'         => $data->name,
                'description' => $data->description,
                'host_name'    => $data->host_name ?? $data->name,
                'monthly_rate' => $data->monthly_cost ?? 0.0,
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
                    'monthly_rate' => $server->monthly_rate,
                ],
            ]);

            return ServerData::fromModel($server);
        } catch (\RuntimeException $e) {
            abort(500, 'Installation failed: ' . $e->getMessage());
        }
    }

    public function show(string $clientUuid, string $serverUuid): ServerData
    {
        $serverModel = Server::where('uuid', $serverUuid)
            ->whereHas('client', fn($q) => $q->where('uuid', $clientUuid))
            ->firstOrFail();

        return ServerData::fromModel($serverModel);
    }

    public function updateAlertScope(Request $request, string $clientUuid, string $serverUuid)
    {
        $request->validate([
            'alert_scope' => ['required', 'string', 'in:global,client,server'],
        ]);

        $serverModel = Server::where('uuid', $serverUuid)
            ->whereHas('client', fn($q) => $q->where('uuid', $clientUuid))
            ->firstOrFail();

        $newScope = $request->input('alert_scope');

        if ($newScope !== 'global') {
            $scopeType = $newScope;
            $scopeId = $scopeType === 'server' ? $serverModel->id : $serverModel->client_id;
            app(\App\NodeConfig\Services\NodeConfigService::class)
                ->copyGlobalConfigIfNeeded($scopeType, $scopeId);
        }

        $serverModel->update(['alert_scope' => $newScope]);
    }

    public function update(UpdateServerData $data, string $clientUuid, string $serverUuid): ServerData
    {
        $serverModel = Server::where('uuid', $serverUuid)
            ->whereHas('client', fn($q) => $q->where('uuid', $clientUuid))
            ->firstOrFail();

        $updatePayload = [];

        if ($data->name !== null && !($data->name instanceof \Spatie\LaravelData\Optional)) {
            $updatePayload['name'] = $data->name;
        }

        if ($data->description !== null && !($data->description instanceof \Spatie\LaravelData\Optional)) {
            $updatePayload['description'] = $data->description;
        }

        if (!($data->monthly_cost instanceof \Spatie\LaravelData\Optional) && $data->monthly_cost !== null) {
            $newRate = (float) $data->monthly_cost;
            $oldRate = (float) ($serverModel->monthly_rate ?? 0.0);
            if (abs($newRate - $oldRate) > 0.0001) {
                $updatePayload['monthly_rate'] = $newRate;
                $updatePayload['rate_updated_at'] = now();
            }
        }

        $originalAttributes = $serverModel->getRawOriginal();

        if (!empty($updatePayload)) {
            $serverModel->update($updatePayload);
        }

        $actor = auth()->user();
        $actorName = $actor ? "{$actor->first_name} {$actor->last_name}" : 'System';

        if (isset($updatePayload['monthly_rate'])) {
            $oldRateFmt = number_format((float) ($originalAttributes['monthly_rate'] ?? 0.0), 2);
            $newRateFmt = number_format((float) $updatePayload['monthly_rate'], 2);

            CustomActivityLog::create([
                'logable_type' => Server::class,
                'logable_id'   => (string) $serverModel->uuid,
                'user_id'      => $actor?->id,
                'user'         => $actorName,
                'action'       => 'Update Monthly Rate',
                'details'      => [
                    'message'     => "Monthly rate updated from ₱{$oldRateFmt}/mo to ₱{$newRateFmt}/mo for server: {$serverModel->name}",
                    'server_name' => $serverModel->name,
                    'before'      => ['monthly_rate' => (float) ($originalAttributes['monthly_rate'] ?? 0.0)],
                    'after'       => ['monthly_rate' => (float) $updatePayload['monthly_rate']],
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
                'logable_id'   => (string) $serverModel->uuid,
                'user_id'      => $actor?->id,
                'user'         => $actorName,
                'action'       => 'Update Server',
                'details'      => [
                    'message' => "Updated server: {$serverModel->name}",
                    'before'  => $before,
                    'after'   => $after,
                ],
            ]);
        }

        \App\Events\ServerStatusUpdated::dispatch(
            $serverModel->uuid,
            $serverModel->status ?? 'online',
            $serverModel->name
        );

        return ServerData::fromModel($serverModel);
    }

    public function adjustCost(Request $request, string $clientUuid, string $serverUuid): ServerData
    {
        $request->validate([
            'action' => ['required', 'string', 'in:deduction,add_funds,add_credit,reset_usage'],
            'amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $serverModel = Server::where('uuid', $serverUuid)
            ->whereHas('client', fn($q) => $q->where('uuid', $clientUuid))
            ->firstOrFail();

        $actor = auth()->user();
        $actorName = $actor ? "{$actor->first_name} {$actor->last_name}" : 'System';
        $actionType = $request->input('action');
        $amount = (float) ($request->input('amount') ?? 0.0);

        if ($actionType === 'reset_usage') {
            $serverModel->update([
                'cost_reset_at'   => now(),
                'rate_updated_at' => now(),
                'historical_cost' => 0.0,
                'accumulated_cost' => 0.0,
                'remitted'         => 0.0,
                'online_seconds'   => 0,
            ]);

            CustomActivityLog::create([
                'type'         => 'billing',
                'logable_type' => Server::class,
                'logable_id'   => (string) $serverModel->uuid,
                'user_id'      => $actor?->id,
                'user'         => $actorName,
                'action'       => 'Reset Cost Baseline',
                'details'      => [
                    'message'     => "Reset cost usage & baseline for server: {$serverModel->name}",
                    'server_name' => $serverModel->name,
                ],
            ]);
        } else {
            // Payment deduction
            $newOffset = (float) $serverModel->remitted + $amount;
            $serverModel->update([
                'remitted' => $newOffset,
            ]);

            $formatted = number_format($amount, 2);

            CustomActivityLog::create([
                'type'         => 'billing',
                'logable_type' => Server::class,
                'logable_id'   => (string) $serverModel->uuid,
                'user_id'      => $actor?->id,
                'user'         => $actorName,
                'action'       => 'Deduction',
                'details'      => [
                    'message'         => "Payment deduction of ₱{$formatted} applied to server: {$serverModel->name}",
                    'payment_amount'  => $amount,
                    'total_payments'  => $newOffset,
                    'server_name'     => $serverModel->name,
                ],
            ]);
        }

        \App\Events\ServerStatusUpdated::dispatch(
            $serverModel->uuid,
            $serverModel->status ?? 'online',
            $serverModel->name
        );

        return ServerData::fromModel($serverModel->fresh());
    }

    public function destroy(string $clientUuid, string $serverUuid)
    {
        $serverModel = Server::where('uuid', $serverUuid)
            ->whereHas('client', fn($q) => $q->where('uuid', $clientUuid))
            ->firstOrFail();

        if ($serverModel->agent()->whereNotNull('registered_at')->exists() && !$serverModel->agent_deleted) {
            return response()->json([
                'message' => 'Cannot delete server while the agent is still running. Please run the uninstall script first.'
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

        // Clean up all action items tied to this server so they are
        // removed from the Action Board immediately after deletion.
        ActionItem::where('server_id', $serverModel->id)->delete();

        $serverModel->update([
            'record_status' => 'archived',
            'status' => 'archived',
        ]);
        $serverModel->delete();

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

        return ServerData::collect($servers->map(fn(Server $s) => ServerData::fromModel($s)));
    }

    public function showWithStats(string $serverUuid, \App\Data\ServerDataRequest $requestData): ServerData
    {
        $server = Server::where('uuid', $serverUuid)->first();
        if (!$server) {
            abort(404, 'Server not found.');
        }

        $server->checkTokenExpiration();

        $tableUnit = $requestData->getTableUnits();
        $subTime = $requestData->getStartFromDatetime();
        $endTime = $requestData->getEndToDatetime();

        $updates = $this->getData($server->id, $tableUnit, $subTime, $endTime);

        $stats = $updates->map(
            fn($row) => StatPointData::from(self::computeStatPointFromAgg($row, $tableUnit))
        )->values()->all();

        $data = ServerData::fromModel($server);
        $data->stats = $stats;

        return $data;
    }

    /** @internal Used by showWithStats and BroadcastServerStats */
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

    public function destroyPort(int $id)
    {
        $port = \App\Models\Port::findOrFail($id);
        $port->delete();
        return response()->json(['status' => 'success']);
    }

    public static function computeStatPointFromAgg(object $row, string $tableUnit): array
    {
        $bucketSeconds = match (true) {
            str_contains($tableUnit, 'minute') => 60,
            str_contains($tableUnit, 'hour')   => 3600,
            str_contains($tableUnit, 'day')    => 86400,
            str_contains($tableUnit, 'week')   => 604800,
            str_contains($tableUnit, 'month')  => 2592000,
            default                            => 60,
        };

        // The database might append a local timezone offset (e.g., +08) to the timestamp string,
        // but the time itself is actually in UTC. We extract just the Y-m-d H:i:s part
        // and parse it explicitly as UTC to get the correct epoch.
        $timeString = substr($row->timestamp, 0, 19);
        $epochMs = \Illuminate\Support\Carbon::parse($timeString, 'UTC')->getPreciseTimestamp(3);

        return [
            'timestamp' => $epochMs,
            'cpu'       => round((float) $row->cpu, 1),
            'memory'    => round((float) $row->memory, 1),
            'disk'      => round((float) $row->disk, 1),
            'netIn'     => round(((float) $row->netIn / 1_000_000) / $bucketSeconds, 2),
            'netOut'    => round(((float) $row->netOut / 1_000_000) / $bucketSeconds, 2),
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
            ->selectRaw('timestamp, cpu, memory, disk, "netIn", "netOut"')
            ->where('server_id', $serverId)
            ->where('timestamp', '>=', $subTime);

        if ($endTime) {
            $query->where('timestamp', '<=', $endTime);
        }

        return $query->orderBy('timestamp')->get();
    }
}
