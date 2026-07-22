<?php

namespace App\Http\Controllers\Api\V1;

use App\Data\CreateServerData;
use App\Data\ServerData;
use App\Data\StatPointData;
use App\Data\UpdateServerData;
use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Server;
use App\Models\ServerUpdate;
use App\Models\CustomActivityLog;
use Dedoc\Scramble\Attributes\QueryParameter;
use Illuminate\Http\Request;

class ServerController extends Controller
{
    public function index(string $clientUuid)
    {
        $clientModel = Client::where('uuid', $clientUuid)->firstOrFail();
        $servers = Server::where('client_id', $clientModel->id)->get();
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
                'hourly_cost'  => $data->hourly_cost ?? 0.0,
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
                    'hourly_cost' => $server->hourly_cost,
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

        if (!($data->hourly_cost instanceof \Spatie\LaravelData\Optional) && $data->hourly_cost !== null) {
            $newRate = (float) $data->hourly_cost;
            if (abs($newRate - (float) ($serverModel->hourly_cost ?? 0.0)) > 0.0001) {
                $dataBefore = ServerData::fromModel($serverModel);
                $updatePayload['historical_cost'] = $dataBefore->gross_cost;
                $updatePayload['rate_updated_at'] = now();
                $updatePayload['hourly_cost'] = $newRate;
            }
        }

        $originalAttributes = $serverModel->getRawOriginal();

        if (!empty($updatePayload)) {
            $serverModel->update($updatePayload);
        }

        if ($serverModel->wasChanged()) {
            $changes = $serverModel->getChanges();

            unset(
                $changes['updated_at']
            );

            $before = [];
            $after = [];

            foreach (array_keys($changes) as $field) {
                $before[$field] = $originalAttributes[$field] ?? null;
                $after[$field] = $serverModel->{$field};
            }

            $details = [
                'message' => "Updated server: {$serverModel->name}",
                'before' => $before,
                'after' => $after,
            ];
        } else {
            $details = [
                'message' => "Saved server configurations without modifications for {$serverModel->name}",
                'before' => [],
                'after' => [],
            ];
        }

        $actor = auth()->user();

        CustomActivityLog::create([
            'logable_type' => Server::class,
            'logable_id' => (string) $serverModel->uuid,
            'user_id' => $actor?->id,
            'user' => $actor ? "{$actor->first_name} {$actor->last_name}" : 'System',
            'action' => 'Update Server',
            'details' => $details,
        ]);

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
            'action' => ['required', 'string', 'in:full_payment,deduction,add_funds,add_credit,reset_usage'],
            'amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $serverModel = Server::where('uuid', $serverUuid)
            ->whereHas('client', fn($q) => $q->where('uuid', $clientUuid))
            ->firstOrFail();

        $actor = auth()->user();
        $actorName = $actor ? "{$actor->first_name} {$actor->last_name}" : 'System';
        $actionType = $request->input('action');
        $amount = (float) ($request->input('amount') ?? 0.0);

        if ($actionType === 'full_payment') {
            $serverDataBefore = ServerData::fromModel($serverModel);
            $paidAmount = $serverDataBefore->net_cost;
            $newOffset = (float) $serverModel->cost_offset + $paidAmount;
            $serverModel->update([
                'cost_offset' => $newOffset,
            ]);

            $formatted = number_format($paidAmount, 2);

            CustomActivityLog::create([
                'logable_type' => Server::class,
                'logable_id'   => (string) $serverModel->uuid,
                'user_id'      => $actor?->id,
                'user'         => $actorName,
                'action'       => 'Full Payment',
                'details'      => [
                    'message'     => "Full payment of ₱{$formatted} recorded for server: {$serverModel->name}",
                    'paid_amount' => $paidAmount,
                    'server_name' => $serverModel->name,
                ],
            ]);
        } elseif ($actionType === 'reset_usage') {
            $serverModel->update([
                'cost_reset_at'   => now(),
                'rate_updated_at' => now(),
                'historical_cost' => 0.0,
                'accumulated_cost' => 0.0,
                'cost_offset'     => 0.0,
                'online_seconds'  => 0,
            ]);

            CustomActivityLog::create([
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
            // Partial payment / deduction / credit allocation
            $newOffset = (float) $serverModel->cost_offset + $amount;
            $serverModel->update([
                'cost_offset' => $newOffset,
            ]);

            $formatted = number_format($amount, 2);

            CustomActivityLog::create([
                'logable_type' => Server::class,
                'logable_id'   => (string) $serverModel->uuid,
                'user_id'      => $actor?->id,
                'user'         => $actorName,
                'action'       => 'Payment Deduction',
                'details'      => [
                    'message'         => "Payment / credit of ₱{$formatted} applied to server: {$serverModel->name}",
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

        if ($serverModel->agent()->exists() && !$serverModel->agent_deleted) {
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
            'action' => 'Delete Server',
            'details' => [
                'message' => "Deleted server: {$serverModel->name}",
                'name' => $serverModel->name,
                'host_name' => $serverModel->host_name,
            ],
        ]);

        $serverModel->delete();

        return response()->json(['status' => 'success']);
    }

    public function listAll(Request $request)
    {
        $query = Server::with('client', 'latestUpdate', 'agent');

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

    public function showWithStats(string $serverUuid): ServerData
    {
        $server = Server::where('uuid', $serverUuid)->first();
        if (!$server) {
            abort(404, 'Server not found.');
        }

        $server->checkTokenExpiration();

        $updates = $server->updates()
            ->orderBy('created_at')
            ->limit(144)
            ->get();

        $stats = [];
        $prev = null;
        foreach ($updates as $row) {
            $stats[] = StatPointData::from(self::computeStatPointPublic($row, $prev));
            $prev = $row;
        }

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
}
