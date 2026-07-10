<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
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
     */
    public function update(): JsonResponse
    {
        $user = request()->user();
        $isAdmin = $user && ($user->username === 'admin' || $user->email === 'admin@example.com' || str_contains($user->email, 'admin'));
        if (!$isAdmin) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $data = request()->validate([
            'secop_limit_per_client' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'heartbeat_interval'     => ['sometimes', 'integer', 'min:1', 'max:60'],
            'offline_threshold'      => ['sometimes', 'integer', 'min:1', 'max:60'],
        ]);

        if (isset($data['heartbeat_interval']) && isset($data['offline_threshold'])) {
            if ($data['heartbeat_interval'] < $data['offline_threshold']) {
                return response()->json([
                    'message' => 'Heartbeat interval must be greater than or equal to the offline threshold.',
                ], 422);
            }
        }

        foreach ($data as $key => $value) {
            Setting::set($key, (string) $value);
        }

        $settings = Setting::all()->pluck('value', 'key');
        return response()->json($settings);
    }
}
