<?php

namespace App\Services;

use App\Enums\DeviceType;
use App\Models\User;
use App\Models\UserSession;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SessionManager
{
    public function __construct(
        private JwtService $jwtService,
        private DeviceDetectorService $deviceDetector,
    ) {}

    public function createSession(
        User $user,
        Request $request,
        bool $rememberMe = false,
    ): array {
        $refreshTokenId = $this->jwtService->generateRefreshTokenId();
        $refreshTokenSecret = $this->jwtService->generateRefreshTokenSecret();
        $refreshTokenHash = $this->jwtService->hashSecret($refreshTokenSecret);
        $refreshTokenString = $this->jwtService->buildRefreshToken($refreshTokenId, $refreshTokenSecret);

        $userAgent = $request->userAgent();
        $deviceType = $this->deviceDetector->detectDeviceType($userAgent);
        $ttlDays = config('jwt.refresh_ttl', 30);

        $session = UserSession::create([
            'user_id' => $user->id,
            'session_uuid' => (string) Str::uuid(),
            'refresh_token_id' => $refreshTokenId,
            'refresh_token_hash' => $refreshTokenHash,
            'remember_me' => $rememberMe,
            'host_name' => $this->deviceDetector->detectDeviceName($userAgent),
            'device_type' => $deviceType->value,
            'browser' => $this->deviceDetector->detectBrowser($userAgent),
            'operating_system' => $this->deviceDetector->detectOperatingSystem($userAgent),
            'user_agent' => $userAgent,
            'ip_address' => $request->ip(),
            'last_activity_at' => now(),
            'last_refresh_at' => now(),
            'expires_at' => now()->addDays($ttlDays),
        ]);

        return [
            'session' => $session,
            'refresh_token' => $refreshTokenString,
        ];
    }

    public function rotateRefreshToken(UserSession $session): array
    {
        $newTokenId = $this->jwtService->generateRefreshTokenId();
        $newTokenSecret = $this->jwtService->generateRefreshTokenSecret();
        $newTokenHash = $this->jwtService->hashSecret($newTokenSecret);
        $newTokenString = $this->jwtService->buildRefreshToken($newTokenId, $newTokenSecret);

        $oldTokenId = $session->refresh_token_id;
        $oldTokenHash = $session->refresh_token_hash;

        $session->update([
            'previous_refresh_token_id' => $oldTokenId,
            'previous_refresh_token_hash' => $oldTokenHash,
            'refresh_token_id' => $newTokenId,
            'refresh_token_hash' => $newTokenHash,
            'last_refresh_at' => now(),
            'last_activity_at' => now(),
        ]);

        $session->refreshTokenRotations()->create([
            'refresh_token_id' => $oldTokenId,
            'refresh_token_hash' => $oldTokenHash,
            'rotated_at' => now(),
        ]);

        return [
            'token' => $newTokenString,
            'session' => $session->fresh(),
        ];
    }

    public function findSessionByRefreshTokenId(string $tokenId): ?UserSession
    {
        return UserSession::where('refresh_token_id', $tokenId)->first();
    }

    public function findSessionByPreviousRefreshTokenId(string $tokenId): ?UserSession
    {
        return UserSession::where('previous_refresh_token_id', $tokenId)->first();
    }

    public function revokeSession(UserSession $session): void
    {
        $session->revoke();
    }

    public function revokeAllUserSessionsExcept(User $user, string $exceptSessionUuid): int
    {
        return UserSession::where('user_id', $user->id)
            ->where('session_uuid', '!=', $exceptSessionUuid)
            ->whereNull('revoked_at')
            ->whereNull('compromised_at')
            ->update(['revoked_at' => now()]);
    }

    public function getActiveSessions(User $user): array
    {
        return UserSession::where('user_id', $user->id)
            ->whereNull('revoked_at')
            ->whereNull('compromised_at')
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->orderByDesc('last_activity_at')
            ->get()
            ->all();
    }

    public function getAllSessions(User $user): array
    {
        return UserSession::where('user_id', $user->id)
            ->orderByDesc('last_activity_at')
            ->get()
            ->all();
    }
}
