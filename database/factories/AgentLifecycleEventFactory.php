<?php

namespace Database\Factories;

use App\Models\Agent;
use App\Models\AgentLifecycleEvent;
use App\Models\Server;
use Illuminate\Database\Eloquent\Factories\Factory;

class AgentLifecycleEventFactory extends Factory
{
    protected $model = AgentLifecycleEvent::class;

    public function definition(): array
    {
        $server = Server::factory()->create();
        $agent = $server->agent ?? Agent::factory()->create();

        return [
            'server_id' => $server->id,
            'agent_id' => $agent->id,
            'event_type' => fake()->randomElement(['started', 'stopping', 'stopped', 'unexpectedly_disconnected']),
            'occurred_at' => now(),
        ];
    }

    public function unexpected(): static
    {
        return $this->state(fn () => ['event_type' => 'unexpectedly_disconnected']);
    }
}
