<?php

namespace App\Http\Controllers;

use App\Data\ClientData;
use App\Data\CreateClientData;
use App\Data\UpdateClientData;
use App\Models\Client;
use App\Services\ImageReplacementService;
use Illuminate\Http\JsonResponse;

class ClientController extends Controller
{
    public function __construct(
        private readonly ImageReplacementService $imageReplacement,
    ) {}

    public function index(): JsonResponse
    {
        $clients = Client::withCount('servers')->get();

        return response()->json(
            $clients->map(fn(Client $client) => ClientData::from([
                'id' => $client->id,
                'name' => $client->name,
                'description' => $client->description ?? '',
                'location' => $client->location ?? '',
                'email' => $client->email,
                'contact_number' => (string) ($client->contact_number ?? ''),
                'banner_image_url' => $client->banner_image_url,
                'banner_image_public_id' => $client->banner_image_public_id,
                'servers_count' => $client->servers_count,
                'created_at' => $client->created_at?->toIso8601String() ?? '',
                'updated_at' => $client->updated_at?->toIso8601String() ?? '',
            ])),
        );
    }

    public function store(CreateClientData $clientdata): JsonResponse
    {
        $client = Client::create([
            'name' => $clientdata->name,
            'description' => $clientdata->description ?? '',
            'location' => $clientdata->location,
            'email' => $clientdata->email,
            'contact_number' => $clientdata->contact_number,
            'banner_image_url' => $clientdata->cloudinary_url ?? '',
            'banner_image_public_id' => $clientdata->cloudinary_public_id ?? null,
        ]);

        $client->loadCount('servers');

        return response()->json(
            ClientData::from([
                'id' => $client->id,
                'name' => $client->name,
                'description' => $client->description,
                'location' => $client->location,
                'email' => $client->email,
                'contact_number' => (string) $client->contact_number,
                'banner_image_url' => $client->banner_image_url,
                'banner_image_public_id' => $client->banner_image_public_id,
                'servers_count' => $client->servers_count,
                'created_at' => $client->created_at?->toIso8601String() ?? '',
                'updated_at' => $client->updated_at?->toIso8601String() ?? '',
            ]),
            201,
        );
    }

    public function show(int $id): JsonResponse
    {
        $client = Client::withCount('servers')->findOrFail($id);

        return response()->json(
            ClientData::from([
                'id' => $client->id,
                'name' => $client->name,
                'description' => $client->description ?? '',
                'location' => $client->location ?? '',
                'email' => $client->email,
                'contact_number' => (string) ($client->contact_number ?? ''),
                'banner_image_url' => $client->banner_image_url,
                'banner_image_public_id' => $client->banner_image_public_id,
                'servers_count' => $client->servers_count,
                'created_at' => $client->created_at?->toIso8601String() ?? '',
                'updated_at' => $client->updated_at?->toIso8601String() ?? '',
            ]),
        );
    }

    public function update(UpdateClientData $data, int $id): JsonResponse
    {
        $client = Client::findOrFail($id);

        $updatePayload = [
            'name' => $data->name,
            'description' => $data->description instanceof \Spatie\LaravelData\Optional ? ($client->description ?? '') : $data->description,
            'location' => $data->location,
            'email' => $data->email,
            'contact_number' => $data->contact_number,
        ];

        if (!($data->cloudinary_url instanceof \Spatie\LaravelData\Optional) && $data->cloudinary_url !== null) {
            $this->imageReplacement->handleReplacement(
                newUrl: $data->cloudinary_url,
                newPublicId: $data->cloudinary_public_id,
                existingUrl: $client->banner_image_url,
                existingPublicId: $client->banner_image_public_id,
            );

            $updatePayload['banner_image_url'] = $data->cloudinary_url;
            $updatePayload['banner_image_public_id'] = $data->cloudinary_public_id ?? null;
        }

        $client->update($updatePayload);
        $client->loadCount('servers');

        return response()->json(
            ClientData::from([
                'id' => $client->id,
                'name' => $client->name,
                'description' => $client->description,
                'location' => $client->location,
                'email' => $client->email,
                'contact_number' => (string) $client->contact_number,
                'banner_image_url' => $client->banner_image_url,
                'banner_image_public_id' => $client->banner_image_public_id,
                'servers_count' => $client->servers_count,
                'created_at' => $client->created_at?->toIso8601String() ?? '',
                'updated_at' => $client->updated_at?->toIso8601String() ?? '',
            ]),
        );
    }

    public function servers(int $id): JsonResponse
    {
        $client = Client::findOrFail($id);
        $servers = $client->servers()->get()->map(fn ($s) => [
            'id' => $s->id,
            'client_id' => $s->client_id,
            'server_name' => $s->server_name,
            'device_name' => $s->device_name,
            'internal_ip' => $s->internal_ip,
            'external_ip' => $s->external_ip,
            'cpu_cores' => $s->cpu_cores,
            'ram' => $s->ram,
            'operating_system' => $s->operating_system,
            'created_at' => $s->created_at?->toIso8601String() ?? '',
            'updated_at' => $s->updated_at?->toIso8601String() ?? '',
        ]);

        return response()->json($servers);
    }

    public function destroy(int $id): JsonResponse
    {
        $client = Client::findOrFail($id);

        $this->imageReplacement->handleDeletion(
            url: $client->banner_image_url,
            publicId: $client->banner_image_public_id,
        );

        $client->delete();

        return response()->json(null, 204);
    }
}
