<?php

namespace App\Http\Controllers\Api\V1;

use App\Data\SecurityActivityData;
use App\Data\SessionData;
use App\Enums\AuthEventType;
use App\Http\Controllers\Controller;
use App\Models\AuthAuditLog;
use App\Models\UserSession;
use App\Services\AuthAuditService;
use App\Services\SessionManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\LaravelData\DataCollection;

class SessionController extends Controller
{
    public function __construct(
        private SessionManager $sessionManager,
        private AuthAuditService $auditService,
    ) {}

    public function index(Request $request): array
    {
        $user = $request->user();
        $sessions = $this->sessionManager->getAllSessions($user);
        $currentSessionUuid = auth('jwt')->getSessionUuid();

        return [
            'data' => array_map(fn(UserSession $s) => SessionData::fromModel($s, $currentSessionUuid), $sessions),
        ];
    }

    public function revoke(Request $request, string $sessionUuid): JsonResponse
    {
        $user = $request->user();
        $currentSessionUuid = auth('jwt')->getSessionUuid();

        $session = UserSession::where('session_uuid', $sessionUuid)
            ->where('user_id', $user->id)
            ->firstOrFail();

        if ($session->session_uuid === $currentSessionUuid) {
            return response()->json(['message' => 'Cannot revoke current session. Use logout instead.'], 422);
        }

        $this->sessionManager->revokeSession($session);

        $this->auditService->log(
            AuthEventType::SessionRevoked,
            $user->id,
            $session->session_uuid,
            $request->ip(),
            $request->userAgent(),
        );

        return response()->json(['message' => 'Session revoked successfully.']);
    }

    public function revokeAllOthers(Request $request): JsonResponse
    {
        $user = $request->user();
        $currentSessionUuid = auth('jwt')->getSessionUuid();

        $count = $this->sessionManager->revokeAllUserSessionsExcept($user, $currentSessionUuid ?? '');

        $this->auditService->log(
            AuthEventType::LogoutAll,
            $user->id,
            ipAddress: $request->ip(),
            userAgent: $request->userAgent(),
            metadata: ['revoked_sessions_count' => $count],
        );

        return response()->json([
            'message' => 'All other sessions logged out.',
            'revoked_count' => $count,
        ]);
    }

    public function permanentDelete(Request $request, string $sessionUuid): JsonResponse
    {
        $user = $request->user();
        $currentSessionUuid = auth('jwt')->getSessionUuid();

        $session = UserSession::where('session_uuid', $sessionUuid)
            ->where('user_id', $user->id)
            ->firstOrFail();

        if ($session->session_uuid === $currentSessionUuid) {
            return response()->json(['message' => 'Cannot delete current session.'], 422);
        }

        if ($session->revoked_at === null && $session->compromised_at === null) {
            return response()->json(['message' => 'Session must be revoked before permanent deletion.'], 422);
        }

        $session->delete();

        return response()->json(['message' => 'Session deleted permanently.']);
    }

    public function securityActivity(Request $request): array
    {
        $user = $request->user();

        $logs = AuthAuditLog::where('user_id', $user->id)
            ->whereIn('event_type', [
                AuthEventType::Login->value,
                AuthEventType::Logout->value,
                AuthEventType::Refresh->value,
                AuthEventType::SessionRevoked->value,
                AuthEventType::SessionCompromised->value,
                AuthEventType::RefreshTokenReuseDetected->value,
            ])
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return [
            'data' => $logs->map(fn(AuthAuditLog $log) => SecurityActivityData::fromModel($log)),
        ];
    }

    public function activeSessionsCount(Request $request): JsonResponse
    {
        $user = $request->user();
        $sessions = $this->sessionManager->getActiveSessions($user);

        return response()->json([
            'active_count' => count($sessions),
        ]);
    }
}
