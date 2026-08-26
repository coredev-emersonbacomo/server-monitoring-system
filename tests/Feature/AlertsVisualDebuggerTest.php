<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('returns 404 when the visual debugger is disabled', function () {
    config(['telemetry.enabled' => false]);

    $this->actingAs(User::factory()->create(), 'jwt');

    $response = $this->getJson('/api/v1/node-configs/telemetry-state');

    $response->assertNotFound();
});

it('returns a full snapshot when the visual debugger is enabled', function () {
    config(['telemetry.enabled' => true]);

    $this->actingAs(User::factory()->create(), 'jwt');

    $response = $this->getJson('/api/v1/node-configs/telemetry-state');

    $response->assertOk();
    $response->assertJsonStructure([
        'server_now',
        'active_tasks',
        'states',
        'last_monitor_sweep_at',
        'monitor_interval_seconds',
    ]);
});
