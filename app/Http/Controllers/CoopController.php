<?php

namespace App\Http\Controllers;

use App\Data\CoopData;
use App\Data\CreateCoopData;
use App\Models\Coop;
use Illuminate\Http\JsonResponse;

class CoopController extends Controller
{
    public function index(): JsonResponse
    {
        $coops = Coop::withCount('servers')->get();

        return response()->json(
            $coops->map(fn(Coop $coop) => CoopData::from([
                'id' => $coop->id,
                'name' => $coop->name,
                'description' => $coop->description ?? '',
                'location' => $coop->location ?? '',
                'email' => $coop->email,
                'contact_number' => (string) ($coop->contact_number ?? ''),
                'banner_image_url' => $coop->banner_image_url ?? '',
                'servers_count' => $coop->servers_count,
                'created_at' => $coop->created_at->toIso8601String(),
                'updated_at' => $coop->updated_at->toIso8601String(),
            ])),
        );
    }

    public function store(CreateCoopData $data): JsonResponse
    {
        $coop = Coop::create([
            'name' => $data->name,
            'description' => $data->description ?? '',
            'location' => $data->location,
            'email' => $data->email,
            'contact_number' => $data->contact_number,
            'banner_image_url' => $data->banner_image_url ?? '',
            'status' => 'active',
        ]);

        $coop->loadCount('servers');

        return response()->json(
            CoopData::from([
                'id' => $coop->id,
                'name' => $coop->name,
                'description' => $coop->description,
                'location' => $coop->location,
                'email' => $coop->email,
                'contact_number' => (string) $coop->contact_number,
                'banner_image_url' => $coop->banner_image_url,
                'servers_count' => $coop->servers_count,
                'created_at' => $coop->created_at->toIso8601String(),
                'updated_at' => $coop->updated_at->toIso8601String(),
            ]),
            201,
        );
    }

    public function show(int $id): JsonResponse
    {
        $coop = Coop::withCount('servers')->findOrFail($id);

        return response()->json(
            CoopData::from([
                'id' => $coop->id,
                'name' => $coop->name,
                'description' => $coop->description ?? '',
                'location' => $coop->location ?? '',
                'email' => $coop->email,
                'contact_number' => (string) ($coop->contact_number ?? ''),
                'banner_image_url' => $coop->banner_image_url ?? '',
                'servers_count' => $coop->servers_count,
                'created_at' => $coop->created_at->toIso8601String(),
                'updated_at' => $coop->updated_at->toIso8601String(),
            ]),
        );
    }

    public function update(CreateCoopData $data, int $id): JsonResponse
    {
        $coop = Coop::findOrFail($id);

        $coop->update([
            'name' => $data->name,
            'description' => $data->description ?? '',
            'location' => $data->location,
            'email' => $data->email,
            'contact_number' => $data->contact_number,
            'banner_image_url' => $data->banner_image_url ?? '',
        ]);

        $coop->loadCount('servers');

        return response()->json(
            CoopData::from([
                'id' => $coop->id,
                'name' => $coop->name,
                'description' => $coop->description,
                'location' => $coop->location,
                'email' => $coop->email,
                'contact_number' => (string) $coop->contact_number,
                'banner_image_url' => $coop->banner_image_url,
                'servers_count' => $coop->servers_count,
                'created_at' => $coop->created_at->toIso8601String(),
                'updated_at' => $coop->updated_at->toIso8601String(),
            ]),
        );
    }

    public function destroy(int $id): JsonResponse
    {
        $coop = Coop::findOrFail($id);
        $coop->delete();

        return response()->json(null, 204);
    }
}
