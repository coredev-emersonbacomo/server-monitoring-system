<?php

use App\Models\CustomActivityLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('activity logs expose the performer uuid', function () {
    $user = User::factory()->create();

    CustomActivityLog::create([
        'user_id' => $user->id,
        'user' => $user->name,
        'action' => 'Updated a user',
        'details' => ['message' => 'User updated'],
    ]);

    $response = $this->actingAs($user, 'jwt')
        ->getJson('/api/v1/activity-logs');

    $response->assertSuccessful()
        ->assertJsonPath('0.user_id', $user->id)
        ->assertJsonPath('0.user_uuid', $user->uuid);
});
