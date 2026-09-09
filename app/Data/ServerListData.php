<?php

namespace App\Data;

use App\Enums\RecordStatus;
use App\Enums\ServerHealth;
use App\Enums\ServerStatus;
use App\Models\Server;
use Spatie\LaravelData\Data;

/**
 * Lean list payload for the servers index. The card grid only renders a
 * handful of scalars, but listAll used to return the full ServerData
 * (ports, processes, activities, agent config — several queries per row,
 * 600+ duplicated queries for 50 rows). Detail endpoints keep using
 * ServerData; this is the list fast path only.
 */
class ServerListData extends Data
{
    public function __construct(
        public string $uuid,
        public string $name,
        public ?string $description,
        public string $host_name,
        public string $client_uuid,
        public string $client_name,
        public string $created_at,
        public string $updated_at,
        public string $record_status,
        public ?string $status = null,
        public bool $agent_deleted = false,
        public bool $is_assigned_to_current_user = false,
        public ?string $operating_system = null,
        public ?int $cpu_cores = null,
        public ?string $ram = null,
        public float $subscription_fee = 0.00,
        public bool $has_registered_agent = false,
    ) {}

    /**
     * @param  int  $offlineThresholdSec  hoisted by the caller so N rows share one Setting read.
     */
    public static function fromModel(Server $server, ?int $userId = null, int $offlineThresholdSec = 15): self
    {
        $client = $server->client;
        $isAssigned = $userId !== null && $client !== null && (
            $client->relationLoaded('secopclients')
                ? $client->secopclients->contains('id', $userId)
                : $client->secopclients()->where('users.id', $userId)->exists()
        );

        $agent = $server->relationLoaded('agent') ? $server->agent : $server->agent()->first();

        return new self(
            uuid: $server->uuid,
            name: $server->name,
            description: $server->description,
            host_name: $server->host_name,
            client_uuid: $client?->uuid ?? '',
            client_name: $client?->name ?? '',
            created_at: $server->created_at->toIso8601String(),
            updated_at: $server->updated_at->toIso8601String(),
            record_status: is_string($server->record_status) ? $server->record_status : ($server->record_status?->value ?? ($server->trashed() ? 'archived' : 'active')),
            status: self::resolveStatus($server, $agent, $offlineThresholdSec),
            agent_deleted: $agent && $agent->registered_at ? (bool) $server->agent_deleted : false,
            is_assigned_to_current_user: $isAssigned,
            operating_system: $server->operating_system,
            cpu_cores: $server->cpu_cores !== null ? (int) $server->cpu_cores : null,
            ram: $server->ram,
            subscription_fee: (float) ($server->subscription_fee ?? 0.00),
            has_registered_agent: $agent && $agent->registered_at ? true : false,
        );
    }

    /**
     * Read-only mirror of ServerData's status resolution. Offline
     * transitions + logging stay on the detail/heartbeat/MonitorServer
     * paths — a list GET must not write per row.
     */
    private static function resolveStatus(Server $server, mixed $agent, int $offlineThresholdSec): string
    {
        if ($server->trashed() || $server->status === 'archived' || $server->record_status === 'archived' || $server->record_status === RecordStatus::Archived) {
            return 'archived';
        }

        if ($server->status === ServerStatus::AgentUninstalled->value || $server->agent_deleted) {
            return ServerStatus::AgentUninstalled->value;
        }

        if (! $agent || ! $agent->registered_at) {
            return $server->status ?? 'pending_installation';
        }

        if ($server->status === ServerStatus::WaitingForFirstHeartbeat->value) {
            return ServerStatus::WaitingForFirstHeartbeat->value;
        }

        return Server::computeHealth($agent->last_seen_at, $offlineThresholdSec) === ServerHealth::Offline
            ? 'offline'
            : ($server->status ?? 'online');
    }
}
