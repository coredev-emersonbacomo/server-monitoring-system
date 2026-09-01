<?php

namespace Database\Factories;

use App\Models\Server;
use App\Models\WatchedPath;
use Illuminate\Database\Eloquent\Factories\Factory;

class WatchedPathFactory extends Factory
{
    protected $model = WatchedPath::class;

    public function definition(): array
    {
        return [
            'path' => 'C:\\ProgramData\\MonitorAgent',
            'scope' => 'agent',
            'server_id' => null,
            'enabled' => true,
            'description' => 'MonitorAgent state/config/identity/update files',
        ];
    }

    public function serverScoped(): static
    {
        return $this->state(fn () => [
            'scope' => 'server',
            'server_id' => Server::factory(),
            'path' => 'C:\\Shared\\Data',
        ]);
    }
}
