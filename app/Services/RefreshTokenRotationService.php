<?php

namespace App\Services;

use App\Models\UserSession;

class RefreshTokenRotationService
{
    public function __construct(
        private JwtService $jwtService,
        private SessionManager $sessionManager,
        private AuthAuditService $auditService,
    ) {}

    public function validateAndRotate(string $refreshToken, string $ip, ?string $userAgent): array
    {
        $parsed = $this->jwtService->parseRefreshToken($refreshToken);
        if (! $parsed) {
            return ['error' => true, 'message' => 'Invalid refresh token format', 'status' => 401];
        }

        $tokenId = $parsed['id'];
        $tokenSecret = $parsed['secret'];

        $session = $this->sessionManager->findSessionByRefreshTokenId($tokenId);

        if (! $session) {
            $session = $this->sessionManager->findSessionByPreviousRefreshTokenId($tokenId);

            if ($session) {
                $matchesPreviousSecret = $session->previous_refresh_token_hash && $this->jwtService->constantTimeCompare(
                    $session->previous_refresh_token_hash,
                    $this->jwtService->hashSecret($tokenSecret)
                );

                $gracePeriodSeconds = (int) config('jwt.refresh_grace_period', 30);
                $isWithinGracePeriod = $matchesPreviousSecret
                    && $session->last_refresh_at
                    && $session->last_refresh_at->diffInSeconds(now()) <= $gracePeriodSeconds
                    && ! $session->isCompromised()
                    && $session->revoked_at === null
                    && ! $session->isExpired();

                if ($isWithinGracePeriod) {
                    $rotation = $this->sessionManager->rotateRefreshToken($session);
                    $this->auditService->log('refresh_grace_window', $session->user_id, $session->session_uuid, $ip, $userAgent);

                    return [
                        'error' => false,
                        'session' => $rotation['session'],
                        'newRefreshToken' => $rotation['token'],
                    ];
                }

                $this->handleReuseDetection($session, $ip, $userAgent);

                return ['error' => true, 'message' => 'Refresh token reuse detected. Session compromised.', 'status' => 401];
            }

            return ['error' => true, 'message' => 'Invalid refresh token', 'status' => 401];
        }

        if (! $this->jwtService->constantTimeCompare(
            $session->refresh_token_hash,
            $this->jwtService->hashSecret($tokenSecret)
        )) {
            $this->auditService->log('refresh_failed', $session->user_id, $session->session_uuid, $ip, $userAgent, [
                'reason' => 'token_secret_mismatch',
                'refresh_token_id' => $tokenId,
            ]);

            return ['error' => true, 'message' => 'Invalid refresh token', 'status' => 401];
        }

        if ($session->isCompromised()) {
            return ['error' => true, 'message' => 'Session compromised. Reauthentication required.', 'status' => 401];
        }

        if ($session->revoked_at !== null) {
            return ['error' => true, 'message' => 'Session revoked.', 'status' => 401];
        }

        if ($session->isExpired()) {
            $this->auditService->log('session_expired', $session->user_id, $session->session_uuid, $ip, $userAgent);

            return ['error' => true, 'message' => 'Session expired.', 'status' => 401];
        }

        $rotation = $this->sessionManager->rotateRefreshToken($session);

        $this->auditService->log('refresh', $session->user_id, $session->session_uuid, $ip, $userAgent);

        return [
            'error' => false,
            'session' => $rotation['session'],
            'newRefreshToken' => $rotation['token'],
        ];
    }

    private function handleReuseDetection(UserSession $session, string $ip, ?string $userAgent): void
    {
        $session->compromise('Refresh token reuse detected');

        $this->auditService->log(
            'refresh_token_reuse_detected',
            $session->user_id,
            $session->session_uuid,
            $ip,
            $userAgent,
            [
                'compromised_at' => now()->toIso8601String(),
                'reason' => 'Refresh token reuse detected via previous_refresh_token_id match',
            ]
        );

        $this->auditService->log(
            'session_compromised',
            $session->user_id,
            $session->session_uuid,
            $ip,
            $userAgent,
            ['reason' => 'Refresh token reuse detected']
        );
    }
}
