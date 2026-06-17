<?php

namespace App\Http\Controllers;

use App\Data\CoopData;
use App\Models\Coop;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

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

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|min:2|max:255',
            'description' => 'nullable|string|min:5',
            'location' => 'required|string|min:5',
            'email' => 'required|email|min:5|max:255',
            'contact_number' => 'required|string|min:5',
            'banner_image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:4096',
        ]);

        $bannerImageUrl = $this->handleBannerUpload($request);

        $coop = Coop::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? '',
            'location' => $validated['location'],
            'email' => $validated['email'],
            'contact_number' => $validated['contact_number'],
            'banner_image_url' => $bannerImageUrl,
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

    public function update(Request $request, int $id): JsonResponse
    {
        $coop = Coop::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|min:2|max:255',
            'description' => 'nullable|string|min:5',
            'location' => 'required|string|min:5',
            'email' => 'required|email|min:5|max:255',
            'contact_number' => 'required|string|min:5',
            'banner_image' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:4096',
        ]);

        $bannerImageUrl = $coop->banner_image_url;
        if ($request->hasFile('banner_image')) {
            if ($coop->banner_image_url) {
                Storage::disk('public')->delete($coop->banner_image_url);
            }
            $bannerImageUrl = $this->handleBannerUpload($request);
        }

        $coop->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? '',
            'location' => $validated['location'],
            'email' => $validated['email'],
            'contact_number' => $validated['contact_number'],
            'banner_image_url' => $bannerImageUrl,
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

    protected function handleBannerUpload(Request $request): string
    {
        if (!$request->hasFile('banner_image')) {
            return '';
        }

        $path = $request->file('banner_image')->store('coop-banners', 'public');

        return Storage::url($path);
    }

    public function destroy(int $id): JsonResponse
    {
        $coop = Coop::findOrFail($id);
        $coop->delete();

        return response()->json(null, 204);
    }
}
