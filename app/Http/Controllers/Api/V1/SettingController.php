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
        $settings = Setting::all()->pluck('value', 'key')->toArray();
        $latestVersion = \App\Models\AgentVersion::orderBy('id', 'desc')->first();
        $settings['agent_version'] = $latestVersion ? $latestVersion->version : '2.0';
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
            'agent_version'          => ['sometimes', 'string'],
        ]);

        if (isset($data['heartbeat_interval']) && isset($data['offline_threshold'])) {
            if ($data['heartbeat_interval'] < $data['offline_threshold']) {
                return response()->json([
                    'message' => 'Heartbeat interval must be greater than or equal to the offline threshold.',
                ], 422);
            }
        }

        if (isset($data['agent_version'])) {
            $latest = \App\Models\AgentVersion::orderBy('id', 'desc')->first();
            if (!$latest || $latest->version !== $data['agent_version']) {
                \App\Models\AgentVersion::create([
                    'version' => $data['agent_version'],
                    'type' => 'agent_binary_update',
                    'binary_url' => url('/MonitorAgent.exe'),
                    'description' => 'Agent binary updated to version ' . $data['agent_version'],
                ]);
            }
        }

        if (isset($data['heartbeat_interval'])) {
            $oldInterval = Setting::get('heartbeat_interval');
            if ($oldInterval !== (string) $data['heartbeat_interval']) {
                $latest = \App\Models\AgentVersion::orderBy('id', 'desc')->first();
                $newVersionNumber = '2.0';
                if ($latest) {
                    $parts = explode('.', $latest->version);
                    if (count($parts) === 2) {
                        $newVersionNumber = $parts[0] . '.' . ((int)$parts[1] + 1);
                    } else {
                        $newVersionNumber = '2.' . ($latest->id + 1);
                    }
                }

                \App\Models\AgentVersion::create([
                    'version' => $newVersionNumber,
                    'type' => 'heartbeat_interval_update',
                    'heartbeat_interval' => (int) $data['heartbeat_interval'],
                    'description' => 'Heartbeat interval updated to ' . $data['heartbeat_interval'] . 's',
                ]);
            }
        }

        unset($data['agent_version']);

        // Capture heartbeat interval before bulk-setting so we can broadcast after
        $newHeartbeatInterval = $data['heartbeat_interval'] ?? null;

        foreach ($data as $key => $value) {
            Setting::set($key, (string) $value);
        }

        // Push config update to all active agents via WebSocket control channel
        if ($newHeartbeatInterval !== null) {
            $agents = \App\Models\Agent::where('status', '!=', 'archived')
                ->with('server')
                ->get();
            foreach ($agents as $agent) {
                if ($agent->server) {
                    event(new \App\Events\AgentConfigUpdated(
                        $agent->server->uuid,
                        (int) $newHeartbeatInterval
                    ));
                }
            }
        }

        $settings = Setting::all()->pluck('value', 'key')->toArray();
        $latestVersion = \App\Models\AgentVersion::orderBy('id', 'desc')->first();
        $settings['agent_version'] = $latestVersion ? $latestVersion->version : '2.0';
        return response()->json($settings);
    }
}
