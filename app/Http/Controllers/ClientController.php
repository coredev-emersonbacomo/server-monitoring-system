<?php

namespace App\Http\Controllers;

use App\Data\ClientData;
use App\Data\CreateClientData;
use App\Data\ServerData;
use App\Data\UpdateClientData;
use App\Jobs\DeleteStorageAsset;
use App\Models\Client;
use App\Services\MediaUrlService;
use App\Services\UploadIntentService;
use Illuminate\Http\JsonResponse;
use Spatie\LaravelData\DataCollection;

class ClientController extends Controller
{
    public function __construct(
        private readonly UploadIntentService $uploadIntentService,
        private readonly MediaUrlService $mediaUrlService,
    ) {}

    public function index(): DataCollection
    {
        $clients = Client::withCount('servers')->get();

        return ClientData::collect(
            $clients->map(fn(Client $client) => ClientData::fromModel($client)->toArray())->toArray(),
            DataCollection::class,
        );
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

    public function show(int $id): ClientData
    {
        $client = Client::withCount('servers')->findOrFail($id);

        return ClientData::fromModel($client);
    }

    public function update(UpdateClientData $data, int $id): ClientData
    {
        $client = Client::findOrFail($id);

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

    public function servers(int $id): DataCollection
    {
        $client = Client::findOrFail($id);
        $servers = $client->servers()->get();

        return ServerData::collect($servers);
    }

    public function destroy(int $id): JsonResponse
    {
        $client = Client::findOrFail($id);

        if ($client->banner_image_storage_key) {
            $folder = config('uploads.purposes.client_banner.folder');
            DeleteStorageAsset::dispatch($client->banner_image_storage_key, $folder);
        }

        $client->delete();

        return response()->json(null, 204);
    }
}
