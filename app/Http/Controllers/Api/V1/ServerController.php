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

        $updateData = $data->toArray();

        if ($data->name !== null) {
            $updateData['server_name'] = $data->name;
        }

        if ($data->description !== null) {
            $updateData['description'] = $data->description;
        }

        if (!($data->alert_scope instanceof \Spatie\LaravelData\Optional)) {
            $updateData['alert_scope'] = $data->alert_scope ?? 'global';
        }

        $originalAttributes = $serverModel->getRawOriginal();

        $serverModel->update($updateData);

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

        return ServerData::fromModel($serverModel);
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

        return ServerData::collect($servers->map(function (Server $server) {
            $tokenModel = $server->provisionTokens()->latest()->first();
            $token = $tokenModel ? $tokenModel->token : '';
            return ServerData::from([
                'uuid'             => $server->uuid,
                'name'             => $server->name,
                'host_name'        => $server->host_name,
                'client_uuid'      => $server->client->uuid,
                'client_name'      => $server->client->name,
                'created_at'       => $server->created_at->toIso8601String(),
                'updated_at'       => $server->updated_at->toIso8601String(),
                'cpu_cores'        => $server->cpu_cores,
                'description' => $server->description,
                'ram'              => $server->ram,
                'disk'             => $server->disk,
                'operating_system' => $server->operating_system,
                'record_status' => $server->record_status->value,
                'status' => $server->status,
                'uninstall_linux_command' => 'sudo curl -fsSL ' . url('/uninstall/linux') . ' | sudo bash -s -- ' . $token,
                'uninstall_windows_command' => 'powershell -ExecutionPolicy Bypass -Command "`$APP_URL=\'' . url('/') . '\'; & ([scriptblock]::Create((irm `$APP_URL/uninstall/windows.ps1))) -ProvisionToken \'' . $token . '\' -AppUrl `$APP_URL"',
                'agent_deleted' => $server->agent ? (bool) $server->agent_deleted : true,
                'alert_scope' => $server->alert_scope ?? 'global',
            ]);
        }));
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

        $client = $server->client;

        $activeDetails = null;
        if (in_array($server->status, ['pending_installation', 'waiting_for_installation'])) {
            $activeToken = $server->activeProvisionToken;
            if ($activeToken && !$activeToken->isExpired()) {
                $token = $activeToken->token;
                $activeDetails = [
                    'token' => $token,
                    'expires_at' => $activeToken->expires_at->copy()->utc()->toIso8601String(),
                    'linux_command' => 'sudo curl -fsSL ' . url('/install/linux') . ' | sudo bash -s -- ' . $token,
                    'windows_command' => 'powershell -ExecutionPolicy Bypass -Command "`$APP_URL=\'' . url('/') . '\'; & ([scriptblock]::Create((irm `$APP_URL/install/windows.ps1))) -ProvisionToken \'' . $token . '\' -AppUrl `$APP_URL"',
                ];
            }
        }

        $tokenModel = $server->provisionTokens()->latest()->first();
        $token = $tokenModel ? $tokenModel->token : '';

        $agent = $server->agent;
        $agentData = null;
        if ($agent) {
            $config = $agent->currentConfiguration;
            $agentData = [
                'version' => $agent->version, // Source of truth for version is what agent reports
                'status' => $agent->status,
                'registered_at' => $agent->registered_at->toIso8601String(),
                'last_seen_at' => $agent->last_seen_at?->toIso8601String(),
                'heartbeat_interval' => $config ? $config->heartbeat_interval : 5,
                'metrics_interval' => $config ? $config->metrics_interval : 5,
                'port_scan_interval' => $config ? $config->port_scan_interval : 60,
                'service_scan_interval' => $config ? $config->service_scan_interval : 60,
                'process_scan_interval' => $config ? $config->process_scan_interval : 60,
                'update_channel' => $config ? $config->update_channel : 'stable',
                'auto_update' => $config ? (bool) $config->auto_update : true,
            ];
        }

        $activities = $server->activities()
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get()
            ->map(fn($a) => [
                'type' => $a->type,
                'description' => $a->description,
                'created_at' => $a->created_at->toIso8601String(),
            ])
            ->toArray();

        return ServerData::from([
            'uuid'                   => $server->uuid,
            'name'                  => $server->name,
            'description' => $server->description,
            'host_name'              => $server->host_name,
            'created_at'             => $server->created_at->toIso8601String(),
            'updated_at'             => $server->updated_at->toIso8601String(),
            'cpu_model'              => $server->cpu_model,
            'cpu_cores'              => $server->cpu_cores ?? null,
            'ram'                    => $server->ram ?? null,
            'disk'                   => $server->disk ?? null,
            'operating_system'       => $server->operating_system ?? null,
            'client_id'              => $server->client_id,
            'client_uuid'            => $client?->uuid ?? '',
            'client_name'            => $client?->name ?? 'Unknown',
            'record_status'          => $server->record_status->value,
            'status'                 => $server->status,
            'stats'                  => $stats,
            'activeProvisionDetails' => $activeDetails,

            'ports' => $server->agent?->ports->map(fn($p) => [
                'id'          => $p->id,
                'port'        => $p->port,
                'protocol'    => $p->protocol,
                'state'       => $p->state,
                'process'     => $p->process_name,
                'ping_status' => $p->ping_status,
                'ping_time'   => $p->ping_time
            ])->toArray(),

            'processes' => $server->agent?->processes()
                ->orderByDesc('cpu')
                ->get()
                ->map(fn($pr) => [
                    'pid'    => $pr->pid,
                    'name'   => $pr->name,
                    'cpu'    => $pr->cpu,
                    'memory' => $pr->memory
                ])->toArray(),

            'uninstall_linux_command' => sprintf(
                'sudo curl -fsSL %s | sudo bash -s -- %s',
                url('/uninstall/linux'),
                $token
            ),

            'uninstall_windows_command' => sprintf(
                'powershell -ExecutionPolicy Bypass -Command "`$APP_URL=\'%s\'; & ([scriptblock]::Create((irm `$APP_URL/uninstall/windows.ps1))) -ProvisionToken \'%s\' -AppUrl `$APP_URL"',
                url('/'),
                $token
            ),

            'agent_deleted' => $server->agent ? (bool) $server->agent_deleted : true,
            'agent' => $agentData,
            'activities' => $activities,
        ]);
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
