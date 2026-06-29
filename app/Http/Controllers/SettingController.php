<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\JsonResponse;

class SettingController extends Controller
{
    /**
     * Return all settings as a key-value map.
     */
    public function index(): JsonResponse
    {
        $settings = Setting::all()->pluck('value', 'key');
        return response()->json($settings);
    }

    /**
     * Bulk-update settings for authenticated users.
     * Accepts: { "secop_limit_per_client": "3", ... }
     */
    public function update(): JsonResponse
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = request()->validate([
            'secop_limit_per_client' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);

        foreach ($data as $key => $value) {
            Setting::set($key, (string) $value);
        }

        $settings = Setting::all()->pluck('value', 'key');
        return response()->json($settings);
    }
}
