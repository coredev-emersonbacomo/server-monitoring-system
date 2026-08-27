<?php

namespace App\Http\Controllers\Api\V1;

use App\Data\AddSecopData;
use App\Data\ClientData;
use App\Data\ClientsIndexData;
use App\Data\CreateClientData;
use App\Data\SecopsUserData;
use App\Data\ServerData;
use App\Data\UpdateClientData;
use App\Http\Controllers\Controller;
use App\Jobs\DeleteStorageAsset;
use App\Models\ActionItem;
use App\Models\Client;
use App\Models\CustomActivityLog;
use App\Models\Server;
use App\Models\Setting;
use App\Models\User;
use App\NodeConfig\Engine\NodeTaskScheduler;
use App\NodeConfig\Models\NodeConfigState;
use App\NodeConfig\Services\NodeConfigService;
use App\Services\MediaUrlService;
use App\Services\UploadIntentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Spatie\LaravelData\Optional;

class ClientController extends Controller
{
    public function __construct(
        private readonly UploadIntentService $uploadIntentService,
        private readonly MediaUrlService $mediaUrlService,
    ) {}

    /** @return ClientData[] */
    public function index(ClientsIndexData $data): array
    {
        $user = request()->user();

        $query = Client::withCount([
            'servers',
            'secopclients',
            'servers as servers_online_count' => fn ($q) => $q->where('status', 'online'),
        ])->with(['secopclients' => function ($q) use ($user) {
            if ($user) {
                $q->where('users.id', $user->id);
            }
        }]);

        if ($data->user_uuid) {
            $query->whereHas('secopclients', function ($q) use ($data) {
                $q->where('users.uuid', $data->user_uuid);
            });
        }

        if ($data->exclude_user_uuid) {
            $query->whereDoesntHave('secopclients', function ($q) use ($data) {
                $q->where('users.uuid', $data->exclude_user_uuid);
            });
        }

        if ($data->isAvailableOnly()) {
            $limit = (int) Setting::get('secop_limit_per_client', 2);

            $query->has('secopclients', '<', $limit);
        }

        return $query
            ->latest()
            ->get()
            ->map(fn (Client $client) => ClientData::fromModel($client, $user?->id))
            ->toArray();
    }

    public function store(CreateClientData $clientdata): ClientData
    {
        $payload = [
            'name' => $clientdata->name,
            'description' => $clientdata->description ?? '',
            'location' => $clientdata->location,
            'email' => $clientdata->email,
            'contact_number' => $clientdata->contact_number,
            'budget' => (float) ($clientdata->budget ?? 0.00),
        ];

        if ($clientdata->upload_intent_id !== null && $clientdata->banner_image_storage_key !== null) {
            $intent = $this->uploadIntentService->attach(
                $clientdata->upload_intent_id,
                request()->user(),
                $client = new Client,
                'client',
            );

            $payload['banner_image_storage_key'] = $clientdata->banner_image_storage_key;
            $payload['banner_image_url'] = $this->mediaUrlService->clientBanner($clientdata->banner_image_storage_key);
        }

        $client = Client::create($payload);

        if (isset($intent)) {
            $intent->update([
                'attached_to_type' => 'client',
                'attached_to_id' => $client->id,
            ]);
        }

        $actor = request()->user();

        CustomActivityLog::create([
            'logable_type' => Client::class,
            'logable_id' => (string) $client->uuid,
            'user_id' => $actor ? $actor->id : null,
            'user' => $actor ? "{$actor->first_name} {$actor->last_name}" : 'System',
            'action' => 'Create Client',
            'details' => [
                'message' => "Created client profile: {$client->name}",
                'name' => $client->name,
                'email' => $client->email,
            ],
        ]);

        $client->loadCount('servers');

        return ClientData::fromModel($client);
    }

    public function show(string $clientUuid): ClientData
    {
        $client = Client::withCount([
            'servers',
            'servers as servers_online_count' => fn ($q) => $q->where('status', 'online'),
        ])->where('uuid', $clientUuid)->firstOrFail();

        return ClientData::fromModel($client);
    }

    public function updateAlertScope(Request $request, string $clientUuid)
    {
        $request->validate([
            'alert_scope' => ['required', 'string', 'in:global,client'],
        ]);

        $client = Client::where('uuid', $clientUuid)->firstOrFail();
        $newScope = $request->input('alert_scope');

        if ($newScope !== 'global') {
            app(NodeConfigService::class)
                ->copyGlobalConfigIfNeeded('client', "client_{$client->uuid}");
        }

        $client->update(['alert_scope' => $newScope]);

        $store = Cache::store(config('cache.default', 'file'));
        $store->forget('node_config:scope:client:'.$client->uuid);

        $affectedServers = Server::where('client_id', $client->id)->get(['id', 'uuid']);
        foreach ($affectedServers as $server) {
            $store->forget('node_config:scope:server:'.$server->uuid);
            NodeTaskScheduler::cancelByServer($server->id);
            NodeConfigState::where('server_id', $server->id)->delete();
        }
    }

    public function update(UpdateClientData $data, string $clientUuid): ClientData
    {
        $client = Client::where('uuid', $clientUuid)->firstOrFail();

        $updatePayload = [
            'name' => $data->name,
            'description' => $data->description instanceof Optional ? ($client->description ?? '') : $data->description,
            'location' => $data->location,
            'email' => $data->email,
            'contact_number' => $data->contact_number,
            'budget' => (float) (($data->budget instanceof Optional || $data->budget === null) ? ($client->budget ?? 0.00) : $data->budget),
        ];

        if (! ($data->alert_scope instanceof Optional)) {
            $updatePayload['alert_scope'] = $data->alert_scope ?? 'global';
        }

        if (! ($data->upload_intent_id instanceof Optional) && $data->upload_intent_id !== null) {
            $oldStorageKey = $client->banner_image_storage_key;
            $oldFolder = config('uploads.purposes.client_banner.folder');

            $intent = $this->uploadIntentService->attach(
                $data->upload_intent_id,
                request()->user(),
                $client,
                'client',
            );

            $updatePayload['banner_image_storage_key'] = $data->banner_image_storage_key;
            $updatePayload['banner_image_url'] = $this->mediaUrlService->clientBanner($data->banner_image_storage_key);

            if ($oldStorageKey) {
                DeleteStorageAsset::dispatch($oldStorageKey, $oldFolder);
            }
        }

        $originalAttributes = $client->getRawOriginal();

        $client->update($updatePayload);

        if ($client->wasChanged()) {
            $changes = $client->getChanges();

            unset(
                $changes['updated_at'],
                $changes['banner_image_storage_key'],
                $changes['banner_image_url']
            );

            if (isset($updatePayload['banner_image_storage_key'])) {
                $changes['banner_image'] = 'changed';
            }

            $oldValues = [];
            $newValues = [];

            foreach (array_keys($changes) as $field) {
                if ($field === 'banner_image') {
                    $oldValues['banner_image'] = $originalAttributes['banner_image_storage_key'] ? 'has_banner' : 'none';
                    $newValues['banner_image'] = 'updated';

                    continue;
                }

                $oldValues[$field] = $originalAttributes[$field] ?? null;
                $newValues[$field] = $client->{$field};
            }

            $details = [
                'message' => "Updated client profile details for {$client->name}",
                'old' => $oldValues,
                'new' => $newValues,
            ];
        } else {
            $details = [
                'message' => "Saved client profile configurations without modifications for {$client->name}",
                'old' => [],
                'new' => [],
            ];
        }

        $actor = request()->user();

        CustomActivityLog::create([
            'logable_type' => Client::class,
            'logable_id' => (string) $client->uuid,
            'user_id' => $actor ? $actor->id : null,
            'user' => $actor ? "{$actor->first_name} {$actor->last_name}" : 'System',
            'action' => 'Update Client',
            'details' => $details,
        ]);

        $client->loadCount([
            'servers',
            'servers as servers_online_count' => fn ($q) => $q->where('status', 'online'),
        ]);

        return ClientData::fromModel($client);
    }

    /** @return ServerData[] */
    public function servers(string $clientUuid): array
    {
        $client = Client::where('uuid', $clientUuid)->firstOrFail();
        $servers = $client->servers()->withTrashed()->get();

        return ServerData::collect($servers->map(fn (Server $s) => ServerData::fromModel($s)))->toArray();
    }

    public function destroy(string $clientUuid): JsonResponse
    {
        $client = Client::where('uuid', $clientUuid)->firstOrFail();

        $runningAgentServer = $client->servers()
            ->where(function ($q) {
                $q->whereNull('agent_deleted')->orWhere('agent_deleted', false);
            })
            ->whereHas('agent', function ($q) {
                $q->whereNotNull('registered_at');
            })
            ->first();

        if ($runningAgentServer) {
            return response()->json([
                'message' => "Cannot delete client while server '{$runningAgentServer->name}' still has an active agent running. Please uninstall all server agents first.",
            ], 422);
        }

        if ($client->banner_image_storage_key) {
            $folder = config('uploads.purposes.client_banner.folder');
            DeleteStorageAsset::dispatch($client->banner_image_storage_key, $folder);
        }

        $actor = request()->user();

        CustomActivityLog::create([
            'logable_type' => Client::class,
            'logable_id' => (string) $client->uuid,
            'user_id' => $actor ? $actor->id : null,
            'user' => $actor ? "{$actor->first_name} {$actor->last_name}" : 'System',
            'action' => 'Delete Client',
            'details' => [
                'message' => "Deleted client profile: {$client->name}",
                'name' => $client->name,
                'email' => $client->email,
            ],
        ]);

        $client->delete();

        return response()->json(null, 204);
    }

    /** @return SecopsUserData[] */
    public function secops(string $clientUuid): array
    {
        $client = Client::where('uuid', $clientUuid)->firstOrFail();

        return SecopsUserData::collect($client->secopclients()->get())->toArray();
    }

    public function addSecop(AddSecopData $data, string $clientUuid): JsonResponse
    {
        $client = Client::where('uuid', $clientUuid)->firstOrFail();

        $user = User::where('uuid', $data->user_uuid)->firstOrFail();

        if ($client->secopclients()->where('user_id', $user->id)->exists()) {
            return response()->json(['error' => 'User already assigned to this client'], 409);
        }

        $limit = (int) Setting::get('secop_limit_per_client', 2);
        if ($client->secopclients()->count() >= $limit) {
            return response()->json([
                'message' => "The client has reached the maximum limit of {$limit} SecOps.",
                'errors' => [
                    'user_uuid' => ["The client has reached the maximum limit of {$limit} SecOps."],
                ],
            ], 422);
        }

        $client->secopclients()->attach($user->id, [
            'uuid' => Str::uuid()->toString(),
            'record_status' => 'active',
        ]);

        $actor = request()->user();

        CustomActivityLog::create([
            'logable_type' => Client::class,
            'logable_id' => (string) $client->uuid,
            'user_id' => $actor ? $actor->id : null,
            'user' => $actor ? "{$actor->first_name} {$actor->last_name}" : 'System',
            'action' => 'Assign SecOps',
            'details' => [
                'message' => "Assigned SecOps user {$user->username} to client {$client->name}",
                'client_name' => $client->name,
                'secops_user_id' => $user->id,
                'secops_username' => $user->username,
            ],
        ]);

        // Resolve any open no_secops action items for this client
        ActionItem::where('action_type', 'no_secops')
            ->where('client_id', $client->id)
            ->where('status', 'open')
            ->whereNotNull('assigned_to')
            ->update(['status' => 'completed', 'completed_at' => now()]);

        ActionItem::where('action_type', 'no_secops')
            ->where('client_id', $client->id)
            ->where('status', 'open')
            ->whereNull('assigned_to')
            ->delete();

        return response()->json(['message' => 'SecOps added successfully'], 201);
    }

    public function removeSecop(string $clientUuid, string $userUuid): JsonResponse
    {
        $client = Client::where('uuid', $clientUuid)->firstOrFail();

        $user = User::where('uuid', $userUuid)->firstOrFail();

        if (! $client->secopclients()->where('user_id', $user->id)->exists()) {
            return response()->json(['error' => 'User not assigned to this client'], 404);
        }

        $actor = request()->user();

        CustomActivityLog::create([
            'logable_type' => Client::class,
            'logable_id' => (string) $client->uuid,
            'user_id' => $actor ? $actor->id : null,
            'user' => $actor ? "{$actor->first_name} {$actor->last_name}" : 'System',
            'action' => 'Remove SecOps',
            'details' => [
                'message' => "Removed SecOps user {$user->username} from client {$client->name}",
                'client_name' => $client->name,
                'secops_user_id' => $user->id,
                'secops_username' => $user->username,
            ],
        ]);

        $client->secopclients()->detach($user->id);

        if ($client->secopclients()->count() === 0) {
            ActionItem::updateOrCreate(
                [
                    'action_type' => 'no_secops',
                    'server_id' => null,
                    'client_id' => $client->id,
                ],
                [
                    'status' => 'open',
                    'assigned_to' => null,
                    'completed_at' => null,
                    'created_at' => now(),
                    'message' => "{$client->name} has no SecOps assigned",
                    'severity' => 'warning',
                    'client_name' => $client->name,
                    'server_name' => null,
                ]
            );
        }

        return response()->json(null, 204);
    }
}
