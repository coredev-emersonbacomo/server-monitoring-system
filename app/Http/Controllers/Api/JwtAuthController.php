<?php

namespace App\Http\Controllers\Api;

use App\Data\AuthUserData;
use App\Data\LoginResponseData;
use App\Data\RefreshResponseData;
use App\Enums\AuthEventType;
use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Models\User;
use App\Models\UserSession;
use App\Services\AuthAuditService;
use App\Services\JwtService;
use App\Services\RefreshTokenRotationService;
use App\Services\SessionManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class JwtAuthController extends Controller
{
    public function __construct(
        private JwtService $jwtService,
        private SessionManager $sessionManager,
        private RefreshTokenRotationService $rotationService,
        private AuthAuditService $auditService,
    ) {}

    public function login(LoginRequest $request): JsonResponse
    {
        $this->ensureIsNotRateLimited($request);

        $login = $request->input('email');
        $user = User::where('email', $login)->orWhere('username', $login)->first();

        if (!$user || !password_verify($request->input('password'), $user->password)) {
            RateLimiter::hit($this->throttleKey($request));

            $this->auditService->log(
                AuthEventType::LoginFailed,
                metadata: ['login' => $login],
                ipAddress: $request->ip(),
                userAgent: $request->userAgent(),
            );

            throw ValidationException::withMessages([
                'email' => ['Invalid credentials.'],
            ]);
        }

        RateLimiter::clear($this->throttleKey($request));

        $rememberMe = $request->boolean('remember', false);

        $result = $this->sessionManager->createSession(
            $user,
            $request,
            $rememberMe,
        );

        $session = $result['session'];
        $refreshToken = $result['refresh_token'];

        $accessToken = $this->jwtService->generateAccessToken(
            $user->id,
            $session->session_uuid,
        );

        $this->auditService->log(
            AuthEventType::Login,
            $user->id,
            $session->session_uuid,
            $request->ip(),
            $request->userAgent(),
        );

        $responseData = LoginResponseData::fromAuth(
            accessToken: $accessToken,
            expiresIn: config('jwt.access_ttl', 15) * 60,
            user: AuthUserData::fromModel($user->load('role')),
            session: $session,
        );

        return response()->json($responseData->toArray())
            ->withCookie($this->buildRefreshTokenCookie($refreshToken, $rememberMe));
    }

    public function refresh(Request $request): JsonResponse
    {
        $refreshToken = $request->cookie(config('jwt.cookie', 'refresh_token'));

        if (!$refreshToken) {
            $this->auditService->log(
                AuthEventType::RefreshFailed,
                ipAddress: $request->ip(),
                userAgent: $request->userAgent(),
                metadata: ['reason' => 'no_refresh_token_cookie'],
            );

            return response()->json(['message' => 'No refresh token provided.'], 401);
        }

        $result = $this->rotationService->validateAndRotate(
            $refreshToken,
            $request->ip(),
            $request->userAgent(),
        );

        if ($result['error']) {
            return response()->json(['message' => $result['message']], $result['status']);
        }

        $session = $result['session'];
        $newRefreshToken = $result['newRefreshToken'];

        $accessToken = $this->jwtService->generateAccessToken(
            $session->user_id,
            $session->session_uuid,
        );

        $responseData = new RefreshResponseData(
            access_token: $accessToken,
            expires_in: config('jwt.access_ttl', 15) * 60,
            session_uuid: $session->session_uuid,
        );

        return response()->json($responseData->toArray())
            ->withCookie($this->buildRefreshTokenCookie($newRefreshToken, $session->remember_me));
    }

    public function logout(Request $request): JsonResponse
    {
        $sessionUuid = auth('jwt')->getSessionUuid();

        if ($sessionUuid) {
            $session = UserSession::where('session_uuid', $sessionUuid)->first();
            if ($session) {
                $this->sessionManager->revokeSession($session);
                $this->auditService->log(
                    AuthEventType::Logout,
                    $session->user_id,
                    $session->session_uuid,
                    $request->ip(),
                    $request->userAgent(),
                );
            }
        }

        return response()->json(['message' => 'Logged out successfully.'])
            ->withCookie(cookie()->forget(config('jwt.cookie', 'refresh_token'), '/api'));
    }

    public function logoutAll(Request $request): JsonResponse
    {
        $user = $request->user();
        $sessionUuid = auth('jwt')->getSessionUuid();

        if ($user) {
            $this->sessionManager->revokeAllUserSessionsExcept($user, $sessionUuid ?? '');
            $this->auditService->log(
                AuthEventType::LogoutAll,
                $user->id,
                ipAddress: $request->ip(),
                userAgent: $request->userAgent(),
            );
        }

        return response()->json(['message' => 'All sessions logged out.'])
            ->withCookie(cookie()->forget(config('jwt.cookie', 'refresh_token'), '/api'));
    }

    public function me(Request $request): AuthUserData
    {
        $user = $request->user();

        $sessionUuid = auth('jwt')->getSessionUuid();
        if ($sessionUuid) {
            UserSession::where('session_uuid', $sessionUuid)->update([
                'last_activity_at' => now(),
            ]);
        }

        return AuthUserData::fromModel($user->load('role'));
    }

    private function ensureIsNotRateLimited(Request $request): void
    {
        if (!RateLimiter::tooManyAttempts($this->throttleKey($request), 5)) {
            return;
        }

        $seconds = RateLimiter::availableIn($this->throttleKey($request));

        throw ValidationException::withMessages([
            'email' => [
                'message' => 'Too many login attempts. Please try again in ' . $seconds . ' seconds.',
                'retry_after_seconds' => $seconds,
                'available_at' => now()->addSeconds($seconds)->timestamp,
            ],
        ])->status(429);
    }

    private function throttleKey(Request $request): string
    {
        return strtolower($request->input('email', '')) . '|' . $request->ip();
    }

    private function buildRefreshTokenCookie(string $refreshToken, bool $rememberMe): \Symfony\Component\HttpFoundation\Cookie
    {
        $minutes = $rememberMe ? 60 * 24 * 30 : 0;

        return cookie(
            name: config('jwt.cookie', 'refresh_token'),
            value: $refreshToken,
            minutes: $minutes,
            path: '/api',
            domain: null,
            secure: config('jwt.cookie_secure', false),
            httpOnly: true,
            sameSite: 'lax',
        );
    }
}
