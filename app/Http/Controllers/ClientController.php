<?php

namespace App\Http\Controllers;

use App\Data\AddSecopData;
use App\Data\ClientData;
use App\Data\CreateClientData;
use App\Data\SecopsUserData;
use App\Data\ServerData;
use App\Data\UpdateClientData;
use App\Jobs\DeleteStorageAsset;
use App\Models\Client;
use App\Models\User;
use App\Services\MediaUrlService;
use App\Services\UploadIntentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

class ClientController extends Controller
{
    public function __construct(
        private readonly UploadIntentService $uploadIntentService,
        private readonly MediaUrlService $mediaUrlService,
    ) {
    }

    /** @return ClientData[] */
    public function index(): array
    {
        $clients = Client::withCount('servers')->get();

        return $clients->map(fn(Client $client) => ClientData::fromModel($client))->toArray();
    }

    public function store(CreateClientData $clientdata): ClientData
    {
        $payload = [
            'name' => $clientdata->name,
            'description' => $clientdata->description ?? '',
            'location' => $clientdata->location,
            'email' => $clientdata->email,
            'contact_number' => $clientdata->contact_number,
        ];

        if ($clientdata->upload_intent_id !== null && $clientdata->banner_image_storage_key !== null) {
            $intent = $this->uploadIntentService->attach(
                $clientdata->upload_intent_id,
                request()->user(),
                $client = new Client(),
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

        $client->loadCount('servers');

        return ClientData::fromModel($client);
    }

    public function show(string $clientUuid): ClientData
    {
        $client = Client::withCount('servers')->where('uuid', $clientUuid)->firstOrFail();

        return ClientData::fromModel($client);
    }

    public function update(UpdateClientData $data, string $clientUuid): ClientData
    {
        $client = Client::where('uuid', $clientUuid)->firstOrFail();

    $updatePayload = [  
            'name' => $data->name,
            'description' => $data->description instanceof \Spatie\LaravelData\Optional ? ($client->description ?? '') : $data->description,
            'location' => $data->location,
            'email' => $data->email,
            'contact_number' => $data->contact_number,
        ];

        if (!($data->upload_intent_id instanceof \Spatie\LaravelData\Optional) && $data->upload_intent_id !== null) {
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

        $client->update($updatePayload);
        $client->loadCount('servers');

        return ClientData::fromModel($client);
    }

    /** @return ServerData[] */
    public function servers(string $clientUuid): array
    {
        $client = Client::where('uuid', $clientUuid)->firstOrFail();
        $servers = $client->servers()->get();

        return ServerData::collect($servers)->toArray();
    }

    public function destroy(string $clientUuid): JsonResponse
    {
        $client = Client::where('uuid', $clientUuid)->firstOrFail();

        if ($client->banner_image_storage_key) {
            $folder = config('uploads.purposes.client_banner.folder');
            DeleteStorageAsset::dispatch($client->banner_image_storage_key, $folder);
        }

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

        $client->secopclients()->attach($user->id, [
            'uuid' => Str::uuid()->toString(),
            'record_status' => 'active',
        ]);

        return response()->json(['message' => 'SecOps added successfully'], 201);
    }

    public function removeSecop(string $clientUuid, string $userUuid): JsonResponse
    {
        $client = Client::where('uuid', $clientUuid)->firstOrFail();

        $user = User::where('uuid', $userUuid)->firstOrFail();

        if (!$client->secopclients()->where('user_id', $user->id)->exists()) {
            return response()->json(['error' => 'User not assigned to this client'], 404);
        }

        $client->secopclients()->detach($user->id);

        return response()->json(null, 204);
    }
}
