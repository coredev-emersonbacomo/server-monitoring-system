<?php

namespace App\Http\Controllers\Api\V1;

use App\Data\AuthUserData;
use App\Data\LoginData;
use App\Data\LoginResponseData;
use App\Data\RefreshResponseData;
use App\Enums\AuthEventType;
use App\Http\Controllers\Controller;
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

    public function login(LoginData $data, Request $request): JsonResponse
    {
        $this->ensureIsNotRateLimited($request);

        $login = $data->email;
        $user = User::where('email', $login)->orWhere('username', $login)->first();

        if (!$user || !password_verify($data->password, $user->password)) {
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

        $rememberMe = $data->remember ?? false;

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

        \App\Models\CustomActivityLog::create([
            'logable_type' => User::class,
            'logable_id' => (string) $user->uuid,
            'user_id' => $user->id,
            'user' => "{$user->first_name} {$user->last_name}",
            'action' => 'Login',
            'details' => [
                'message' => "User {$user->username} Logged in successfully.",
                'session_uuid' => $session->session_uuid,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
        ]);

        $responseData = LoginResponseData::fromAuth(
            accessToken: $accessToken,
            expiresIn: config('jwt.access_ttl', 15) * 60,
            user: AuthUserData::fromModel($user),
            session: $session,
        );

        return $responseData->toResponse($request)
            ->withCookie($this->buildRefreshTokenCookie($refreshToken, $rememberMe))
            ->withCookie(cookie(
                name: 'has_session',
                value: '1',
                minutes: $rememberMe ? 60 * 24 * 30 : 0,
                path: '/',
                secure: config('jwt.cookie_secure', false),
                httpOnly: false,
                sameSite: 'lax',
            ));
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

        return $responseData->toResponse($request)
            ->withCookie($this->buildRefreshTokenCookie($newRefreshToken, $session->remember_me));
    }

    public function logout(Request $request): JsonResponse
    {
        $sessionUuid = auth('jwt')->getSessionUuid();

        if ($sessionUuid) {
            $session = UserSession::where('session_uuid', $sessionUuid)->first();
            if ($session) {
                $user = $session->user;

                if ($user) {
                    \App\Models\CustomActivityLog::create([
                        'logable_type' => User::class,
                        'logable_id' => (string) $user->uuid,
                        'user_id' => $user->id,
                        'user' => "{$user->first_name} {$user->last_name}",
                        'action' => 'Logout',
                        'details' => [
                            'message' => "User {$user->username} Logged out successfully.",
                            'session_uuid' => $sessionUuid,
                            'ip_address' => $request->ip(),
                            'user_agent' => $request->userAgent(),
                        ],
                    ]);
                }

                $this->sessionManager->revokeSession($session);
            }
        }

        return response()->json(['message' => 'Logged out successfully.'])
            ->withCookie(cookie()->forget(config('jwt.cookie', 'refresh_token'), '/api'))
            ->withCookie(cookie()->forget('has_session', '/'));
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
            ->withCookie(cookie()->forget(config('jwt.cookie', 'refresh_token'), '/api'))
            ->withCookie(cookie()->forget('has_session', '/'));
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

        return AuthUserData::fromModel($user);
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
        $login = $request->input('email') ?? $request->input('username') ?? '';
        return strtolower($login) . '|' . $request->ip();
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
