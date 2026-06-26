<?php

use App\Models\Client;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class)->group('settings', 'secops');

beforeEach(function () {
    config(['jwt.secret' => 'test-secret-key-32-chars-long-for-testing!']);

    \Illuminate\Support\Facades\DB::table('roles')->insert([
        ['role_name' => 'Admin'],
        ['role_name' => 'SecOps'],
    ]);

    $this->admin = User::factory()->create([
        'email' => 'admin@example.com',
        'password' => bcrypt('password123'),
        'role_id' => 1,
    ]);

    $this->secop = User::factory()->create([
        'email' => 'secop@example.com',
        'password' => bcrypt('password123'),
        'role_id' => 2,
    ]);

    $this->client = Client::factory()->create();

    Setting::set('secop_limit_per_client', '2');
});

function loginAs(User $user): string
{
    $response = test()->postJson('/api/login', [
        'email' => $user->email,
        'password' => 'password123',
    ]);

    return $response->json('access_token');
}

test('settings index returns key-value settings', function () {
    $token = loginAs($this->admin);

    $response = $this->withHeaders([
        'Authorization' => 'Bearer ' . $token,
    ])->getJson('/api/settings');

    $response->assertStatus(200)
        ->assertJson(['secop_limit_per_client' => '2']);
});

test('admin can update settings', function () {
    $token = loginAs($this->admin);

    $response = $this->withHeaders([
        'Authorization' => 'Bearer ' . $token,
    ])->putJson('/api/settings', [
        'secop_limit_per_client' => 3,
    ]);

    $response->assertStatus(200)
        ->assertJson(['secop_limit_per_client' => '3']);

    expect(Setting::get('secop_limit_per_client'))->toBe('3');
});

test('non-admin cannot update settings', function () {
    $token = loginAs($this->secop);

    $response = $this->withHeaders([
        'Authorization' => 'Bearer ' . $token,
    ])->putJson('/api/settings', [
        'secop_limit_per_client' => 5,
    ]);

    $response->assertStatus(403);
});

test('admin can assign secops to a client within limit', function () {
    $secopTwo = User::factory()->create(['role_id' => 2]);
    $token = loginAs($this->admin);

    $response = $this->withHeaders([
        'Authorization' => 'Bearer ' . $token,
    ])->postJson("/api/clients/{$this->client->id}/secops", [
        'secop_ids' => [$this->secop->id, $secopTwo->id],
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('secops.0.id', $this->secop->id)
        ->assertJsonPath('secops.1.id', $secopTwo->id);

    $this->assertDatabaseHas('sec_ops', [
        'client_id' => $this->client->id,
        'user_id' => $this->secop->id,
        'status' => 'active',
    ]);
});

test('assign secops rejects assignments above configured limit', function () {
    $secopTwo = User::factory()->create(['role_id' => 2]);
    $secopThree = User::factory()->create(['role_id' => 2]);
    $token = loginAs($this->admin);

    $response = $this->withHeaders([
        'Authorization' => 'Bearer ' . $token,
    ])->postJson("/api/clients/{$this->client->id}/secops", [
        'secop_ids' => [$this->secop->id, $secopTwo->id, $secopThree->id],
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['secop_ids']);
});

test('assign secops rejects non-secops users', function () {
    $adminUser = User::factory()->create(['role_id' => 1]);
    $token = loginAs($this->admin);

    $response = $this->withHeaders([
        'Authorization' => 'Bearer ' . $token,
    ])->postJson("/api/clients/{$this->client->id}/secops", [
        'secop_ids' => [$adminUser->id],
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['secop_ids']);
});

test('non-admin cannot assign secops', function () {
    $token = loginAs($this->secop);

    $response = $this->withHeaders([
        'Authorization' => 'Bearer ' . $token,
    ])->postJson("/api/clients/{$this->client->id}/secops", [
        'secop_ids' => [$this->secop->id],
    ]);

    $response->assertStatus(403);
});

test('client show includes assigned secops', function () {
    $this->client->secopclients()->attach($this->secop->id, ['status' => 'active']);
    $token = loginAs($this->admin);

    $response = $this->withHeaders([
        'Authorization' => 'Bearer ' . $token,
    ])->getJson("/api/clients/{$this->client->id}");

    $response->assertStatus(200)
        ->assertJsonPath('secops.0.id', $this->secop->id);
});
