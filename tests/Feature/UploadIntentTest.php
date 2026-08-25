<?php

use App\Enums\UploadIntentStatus;
use App\Enums\UploadPurpose;
use App\Jobs\CleanupExpiredUploadIntents;
use App\Models\UploadIntent;
use App\Models\User;
use App\Services\MediaUrlService;
use App\Services\StorageProviderFactory;
use App\Services\UploadIntentService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class)->group('uploads');

beforeEach(function () {
    config(['jwt.secret' => 'test-secret-key-32-chars-long-for-testing!']);
    config(['uploads.default_provider' => 'cloudinary']);
    config(['uploads.providers.cloudinary.cloud_name' => 'test-cloud']);
    config(['uploads.providers.cloudinary.api_key' => 'test-key']);
    config(['uploads.providers.cloudinary.api_secret' => 'test-secret']);

    $this->user = User::factory()->create([
        'email' => 'test@example.com',
        'password' => bcrypt('password123'),
    ]);

    $loginResponse = $this->postJson('/api/login', [
        'email' => 'test@example.com',
        'password' => 'password123',
    ]);

    $this->token = $loginResponse->json('access_token');
    $this->headers = ['Authorization' => 'Bearer '.$this->token];
});

// ─── Upload Intent Creation ───────────────────────────────────────────────────

test('authenticated user can create upload intent', function () {
    $response = $this->withHeaders($this->headers)
        ->postJson('/api/upload-intents', [
            'purpose' => 'profile_picture',
        ]);

    $response->assertStatus(201)
        ->assertJsonStructure([
            'intent_id',
            'storage_key',
            'provider',
            'upload_config',
            'purpose_config' => ['max_file_size', 'allowed_mime_types'],
            'expires_at',
        ]);

    expect($response->json('provider'))->toBe('cloudinary');
    expect($response->json('purpose_config.max_file_size'))->toBe(5 * 1024 * 1024);

    $this->assertDatabaseHas('upload_intents', [
        'id' => $response->json('intent_id'),
        'user_id' => $this->user->id,
        'purpose' => 'profile_picture',
        'status' => 'pending',
    ]);
});

test('unauthenticated user cannot create upload intent', function () {
    $response = $this->postJson('/api/upload-intents', [
        'purpose' => 'profile_picture',
    ]);

    $response->assertStatus(401);
});

test('upload intent creation with invalid purpose returns validation error', function () {
    $response = $this->withHeaders($this->headers)
        ->postJson('/api/upload-intents', [
            'purpose' => 'invalid_purpose',
        ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['purpose']);
});

test('upload intent creation with missing purpose returns validation error', function () {
    $response = $this->withHeaders($this->headers)
        ->postJson('/api/upload-intents', []);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['purpose']);
});

test('upload intent creates client banner purpose correctly', function () {
    $response = $this->withHeaders($this->headers)
        ->postJson('/api/upload-intents', [
            'purpose' => 'client_banner',
        ]);

    $response->assertStatus(201);
    expect($response->json('purpose_config.max_file_size'))->toBe(10 * 1024 * 1024);
    expect($response->json('purpose_config.allowed_mime_types'))->toContain('image/jpeg', 'image/png', 'image/webp');
});

// ─── Upload Intent Retrieval ──────────────────────────────────────────────────

test('user can view their own upload intent', function () {
    $createResponse = $this->withHeaders($this->headers)
        ->postJson('/api/upload-intents', ['purpose' => 'profile_picture']);

    $intentId = $createResponse->json('intent_id');

    $response = $this->withHeaders($this->headers)
        ->getJson("/api/upload-intents/{$intentId}");

    $response->assertStatus(200)
        ->assertJson([
            'id' => $intentId,
            'purpose' => 'profile_picture',
            'status' => 'pending',
        ]);
});

test('user cannot view another users upload intent', function () {
    $otherUser = User::factory()->create();
    $intent = UploadIntent::create([
        'user_id' => $otherUser->id,
        'purpose' => UploadPurpose::PROFILE_PICTURE,
        'storage_provider' => 'cloudinary',
        'storage_key' => 'profile_pictures/user_2/test-uuid',
        'status' => UploadIntentStatus::PENDING,
        'expires_at' => now()->addHours(24),
    ]);

    $response = $this->withHeaders($this->headers)
        ->getJson("/api/upload-intents/{$intent->id}");

    $response->assertStatus(403);
});

// ─── Rate Limiting ────────────────────────────────────────────────────────────

test('upload intent creation is rate limited', function () {
    $purpose = 'profile_picture';
    $limit = config('uploads.rate_limits.profile_picture');

    // Exhaust the limit
    for ($i = 0; $i < $limit; $i++) {
        $this->withHeaders($this->headers)
            ->postJson('/api/upload-intents', ['purpose' => $purpose]);
    }

    // This one should be rate limited
    $response = $this->withHeaders($this->headers)
        ->postJson('/api/upload-intents', ['purpose' => $purpose]);

    $response->assertStatus(429);
});

// ─── Upload Intent Service ────────────────────────────────────────────────────

test('upload intent service generates correct storage key format', function () {
    $service = app(UploadIntentService::class);
    $intent = $service->create($this->user, UploadPurpose::PROFILE_PICTURE);

    expect($intent->storage_key)->toMatch('/^profile_pictures\/user_\d+\/[\w-]+$/');
});

test('upload intent service enforces expiration', function () {
    $service = app(UploadIntentService::class);
    $intent = $service->create($this->user, UploadPurpose::PROFILE_PICTURE);

    // Manually expire the intent
    $intent->update(['expires_at' => now()->subHour()]);

    expect($intent->isExpired())->toBeTrue();
    expect($intent->isPending())->toBeTrue();

    expect(fn () => $service->validateAttachment($intent, $this->user))
        ->toThrow(InvalidArgumentException::class, 'has expired');
});

test('upload intent service validates ownership', function () {
    $service = app(UploadIntentService::class);
    $intent = $service->create($this->user, UploadPurpose::PROFILE_PICTURE);

    $otherUser = User::factory()->create();

    expect(fn () => $service->validateAttachment($intent, $otherUser))
        ->toThrow(InvalidArgumentException::class, 'does not belong to this user');
});

test('upload intent service prevents double attachment', function () {
    $service = app(UploadIntentService::class);
    $intent = $service->create($this->user, UploadPurpose::PROFILE_PICTURE);

    $service->markDeleted($intent);

    expect(fn () => $service->validateAttachment($intent, $this->user))
        ->toThrow(InvalidArgumentException::class, 'not in a pending state');
});

// ─── Attachment Workflow ──────────────────────────────────────────────────────

test('upload intent can be attached to entity', function () {
    $service = app(UploadIntentService::class);
    $intent = $service->create($this->user, UploadPurpose::PROFILE_PICTURE);

    $attached = $service->attach($intent->id, $this->user, $this->user, 'user');

    expect($attached->status)->toBe(UploadIntentStatus::ATTACHED);
    expect($attached->attached_to_type)->toBe('user');
    expect($attached->attached_to_id)->toBe($this->user->id);
    expect($attached->attached_at)->not->toBeNull();
});

// ─── Cleanup ──────────────────────────────────────────────────────────────────

test('cleanup job processes expired intents', function () {
    $service = app(UploadIntentService::class);
    $intent = $service->create($this->user, UploadPurpose::PROFILE_PICTURE);

    $intent->update([
        'expires_at' => now()->subHours(2),
    ]);

    $intentService = app(UploadIntentService::class);
    $job = new CleanupExpiredUploadIntents;
    $job->handle($intentService);

    $this->assertDatabaseHas('upload_intents', [
        'id' => $intent->id,
        'status' => UploadIntentStatus::EXPIRED->value,
    ]);
});

test('cleanup job does not affect non-expired intents', function () {
    $service = app(UploadIntentService::class);
    $intent = $service->create($this->user, UploadPurpose::PROFILE_PICTURE);

    $job = app(CleanupExpiredUploadIntents::class);
    $job->handle(app(UploadIntentService::class));

    $this->assertDatabaseHas('upload_intents', [
        'id' => $intent->id,
        'status' => UploadIntentStatus::PENDING->value,
    ]);
});

// ─── Media URL Service ────────────────────────────────────────────────────────

test('media url service generates correct profile picture url', function () {
    $mediaService = app(MediaUrlService::class);

    $url = $mediaService->profilePicture('profile_pictures/user_1/test-key');

    expect($url)->toContain('res.cloudinary.com');
    expect($url)->toContain('test-cloud');
    expect($url)->toContain('profile_pictures/user_1/test-key');
});

test('media url service returns default for empty storage key', function () {
    $mediaService = app(MediaUrlService::class);

    $url = $mediaService->profilePicture(null);

    expect($url)->toBe(config('app.default_profile_picture'));
});

test('media url service generates transformed url', function () {
    $mediaService = app(MediaUrlService::class);

    $url = $mediaService->profilePictureTransformed(
        'profile_pictures/user_1/test-key',
        'avatar_64',
    );

    expect($url)->toContain('width_64');
    expect($url)->toContain('height_64');
    expect($url)->toContain('crop_fill');
});

// ─── Provider Switching Compatibility ─────────────────────────────────────────

test('storage provider factory creates cloudinary provider', function () {
    $factory = app(StorageProviderFactory::class);
    $provider = $factory->make('cloudinary');

    expect($provider->name())->toBe('cloudinary');
});

test('storage provider factory creates local provider', function () {
    config(['uploads.providers.local.base_path' => 'uploads']);
    config(['uploads.providers.local.delivery_url' => '/storage/uploads']);

    $factory = app(StorageProviderFactory::class);
    $provider = $factory->make('local');

    expect($provider->name())->toBe('local');
});

test('storage provider can be switched via configuration', function () {
    // Configure to use local
    config(['uploads.default_provider' => 'local']);
    config(['uploads.providers.local.base_path' => 'uploads']);
    config(['uploads.providers.local.delivery_url' => '/storage/uploads']);

    $service = app(UploadIntentService::class);
    $intent = $service->create($this->user, UploadPurpose::PROFILE_PICTURE);

    expect($intent->storage_provider)->toBe('local');
});

test('cloudinary provider generates upload config', function () {
    $factory = app(StorageProviderFactory::class);
    $provider = $factory->make('cloudinary');

    $config = $provider->uploadConfig(
        'profile_pictures/user_1/test-uuid',
        'profile_pictures',
        config('uploads.purposes.profile_picture'),
    );

    expect($config)
        ->toHaveKey('provider', 'cloudinary')
        ->toHaveKey('upload_url')
        ->toHaveKey('upload_params')
        ->and($config['upload_params'])
        ->toHaveKeys(['api_key', 'timestamp', 'folder', 'public_id', 'signature']);
});
