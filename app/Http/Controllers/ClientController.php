<?php

namespace App\Http\Controllers;

use App\Data\ClientData;
use App\Models\Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ClientController extends Controller
{
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
                'banner_image_url' => $client->banner_image_url ?? '',
                'servers_count' => $client->servers_count,
                'created_at' => $client->created_at?->toIso8601String() ?? '',
                'updated_at' => $client->updated_at?->toIso8601String() ?? '',
            ])),
        );
    }

    public function store(ClientData $clientdata, Request $request): JsonResponse
    {
        $bannerImageUrl = $this->handleBannerUpload($request);

        $client = Client::create([
            'name' => $clientdata->name,
            'description' => $clientdata->description ?? '',
            'location' => $clientdata->location,
            'email' => $clientdata->email,
            'contact_number' => $clientdata->contact_number,
            'banner_image_url' => $bannerImageUrl,
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
                'banner_image_url' => $client->banner_image_url ?? '',
                'servers_count' => $client->servers_count,
                'created_at' => $client->created_at?->toIso8601String() ?? '',
                'updated_at' => $client->updated_at?->toIso8601String() ?? '',
            ]),
        );
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $client = Client::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|min:2|max:255',
            'description' => 'nullable|string|min:5',
            'location' => 'required|string|min:5',
            'email' => 'required|email|min:5|max:255',
            'contact_number' => 'required|string|min:5',
            'banner_image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:4096',
        ]);

        $bannerImageUrl = $client->banner_image_url;
        if ($request->hasFile('banner_image')) {
            if ($client->banner_image_url) {
                Storage::disk('public')->delete($client->banner_image_url);
            }
            $bannerImageUrl = $this->handleBannerUpload($request);
        }

        $client->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? '',
            'location' => $validated['location'],
            'email' => $validated['email'],
            'contact_number' => $validated['contact_number'],
            'banner_image_url' => $bannerImageUrl,
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
                'servers_count' => $client->servers_count,
                'created_at' => $client->created_at?->toIso8601String() ?? '',
                'updated_at' => $client->updated_at?->toIso8601String() ?? '',
            ]),
        );
    }

    protected function handleBannerUpload(Request $request): string
    {
        if (!$request->hasFile('banner_image')) {
            return '';
        }

        $path = $request->file('banner_image')->store('client-banners', 'public');

        return Storage::url($path);
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
        $client->delete();

        return response()->json(null, 204);
    }
}
