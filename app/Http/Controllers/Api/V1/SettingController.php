<?php

namespace App\Http\Controllers\Api\V1;

use App\Data\UpdateSettingsData;
use App\Events\AgentConfigUpdated;
use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Agent;
use App\Models\AgentVersion;
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
        $latestVersion = AgentVersion::orderBy('id', 'desc')->first();
        $settings['agent_version'] = $latestVersion ? $latestVersion->version : '2.0';

        return response()->json($settings);
    }

    /**
     * Bulk-update settings for authenticated users.
     */
    public function update(UpdateSettingsData $data): JsonResponse
    {
        $attributes = collect($data->toArray())->filter(fn ($value) => $value !== null);

        if ($attributes->has('heartbeat_interval') && $attributes->has('offline_threshold')) {
            if ((int) $attributes['offline_threshold'] < (int) $attributes['heartbeat_interval']) {
                return response()->json([
                    'message' => 'Offline threshold must be greater than or equal to the heartbeat interval.',
                ], 422);
            }
        }

        $agentVersion = $attributes->pull('agent_version');
        if ($agentVersion !== null) {
            $latest = AgentVersion::orderBy('id', 'desc')->first();
            if (! $latest || $latest->version !== $agentVersion) {
                AgentVersion::create([
                    'version' => $agentVersion,
                    'binary_url' => url('/MonitorAgent.exe'),
                    'description' => 'Agent binary updated to version ' . $agentVersion,
                ]);
            }
        }

        // Capture heartbeat interval before bulk-setting so we can broadcast after
        $newHeartbeatInterval = $attributes->has('heartbeat_interval') ? (int) $attributes['heartbeat_interval'] : null;

        foreach ($attributes as $key => $value) {
            Setting::set($key, (string) $value);
        }

        // Push config update to all active agents via WebSocket control channel
        if ($newHeartbeatInterval !== null) {
            $agents = Agent::where('status', '!=', 'archived')
                ->with('server')
                ->get();
            foreach ($agents as $agent) {
                if ($agent->server) {
                    event(new AgentConfigUpdated(
                        $agent->server->uuid,
                        $newHeartbeatInterval
                    ));

                    Activity::create([
                        'server_id' => $agent->server->id,
                        'agent_id' => $agent->id,
                        'type' => 'config_updated',
                        'description' => "Agent heartbeat interval updated to {$newHeartbeatInterval}s.",
                    ]);
                }
            }
        }

        return $this->index();
    }
}
