<?php

namespace Database\Factories;

use App\Models\Agent;
use App\Models\FileActivityLog;
use App\Models\Server;
use Illuminate\Database\Eloquent\Factories\Factory;

class FileActivityLogFactory extends Factory
{
    protected $model = FileActivityLog::class;

    public function definition(): array
    {
        $server = Server::factory()->create();
        $agent = $server->agent ?? Agent::factory()->create();

        return [
            'server_id' => $server->id,
            'agent_id' => $agent->id,
            'action' => fake()->randomElement(['created', 'modified', 'moved', 'renamed', 'deleted']),
            'file_name' => fake()->word().'.txt',
            'source_path' => 'C:\\ProgramData\\MonitorAgent\\'.fake()->word().'.txt',
            'destination_path' => null,
            'is_directory' => false,
            'username' => fake()->userName(),
            'process_name' => 'explorer.exe',
            'process_id' => fake()->randomNumber(5),
            'occurred_at' => now(),
        ];
    }

    public function agentScoped(): static
    {
        return $this->state(fn () => ['server_id' => null]);
    }
}
