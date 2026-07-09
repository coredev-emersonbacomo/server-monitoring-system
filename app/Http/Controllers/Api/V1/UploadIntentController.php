<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUploadIntentRequest;
use App\Models\UploadIntent;
use App\Services\UploadIntentService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\RateLimiter;

class UploadIntentController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly UploadIntentService $uploadIntentService,
    ) {}

    public function store(StoreUploadIntentRequest $request): JsonResponse
    {
        $user = $request->user();
        $purpose = $request->purpose();

        $rateLimitKey = "upload-intent:{$user->id}:{$purpose->value}";
        $maxAttempts = $this->uploadIntentService->getRateLimit($purpose);

        if (RateLimiter::tooManyAttempts($rateLimitKey, $maxAttempts)) {
            $seconds = RateLimiter::availableIn($rateLimitKey);

            return response()->json([
                'message' => 'Too many upload requests. Please try again later.',
                'retry_after' => $seconds,
            ], 429);
        }

        RateLimiter::hit($rateLimitKey);

        $intent = $this->uploadIntentService->create($user, $purpose);

        $purposeConfig = $this->uploadIntentService->getPurposeConfig($purpose);

        return response()->json([
            'intent_id' => $intent->id,
            'storage_key' => $intent->storage_key,
            'provider' => $intent->storage_provider,
            'upload_config' => $intent->metadata,
            'purpose_config' => [
                'max_file_size' => $purposeConfig['max_file_size'],
                'allowed_mime_types' => $purposeConfig['allowed_mime_types'],
            ],
            'expires_at' => $intent->expires_at->toIso8601String(),
        ], 201);
    }

    public function show(UploadIntent $uploadIntent): JsonResponse
    {
        $this->authorize('view', $uploadIntent);

        return response()->json([
            'id' => $uploadIntent->id,
            'purpose' => $uploadIntent->purpose->value,
            'storage_key' => $uploadIntent->storage_key,
            'provider' => $uploadIntent->storage_provider,
            'status' => $uploadIntent->status->value,
            'attached_to_type' => $uploadIntent->attached_to_type,
            'attached_to_id' => $uploadIntent->attached_to_id,
            'attached_at' => $uploadIntent->attached_at?->toIso8601String(),
            'expires_at' => $uploadIntent->expires_at?->toIso8601String(),
            'created_at' => $uploadIntent->created_at->toIso8601String(),
        ]);
    }
}
