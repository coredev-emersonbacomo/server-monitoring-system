<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AuthEventType;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuthAuditService;
use App\Services\NotificationService;
use Illuminate\Contracts\View\View;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class EmailVerificationController extends Controller
{
    public function __construct(
        private readonly NotificationService $notificationService,
        private readonly AuthAuditService $auditService,
    ) {}

    public function resend(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->email_verified_at !== null) {
            $this->auditService->log(
                AuthEventType::EmailVerificationRequested,
                $user->id,
                auth('jwt')->getSessionUuid(),
                $request->ip(),
                $request->userAgent(),
                ['reason' => 'already_verified'],
            );

            throw ValidationException::withMessages([
                'email' => ['Your email address has already been verified.'],
            ]);
        }

        $verifyUrl = $this->buildVerifyUrl($user);

        $this->notificationService->sendEmailVerification(
            $user->email,
            $verifyUrl,
            expiresInMinutes: 60,
        );

        $this->auditService->log(
            AuthEventType::EmailVerificationRequested,
            $user->id,
            auth('jwt')->getSessionUuid(),
            $request->ip(),
            $request->userAgent(),
        );

        return response()->json([
            'message' => 'A verification link has been sent to your email.',
            'masked_email' => $this->maskEmail($user->email),
        ]);
    }

    public function verify(Request $request): View|Response
    {
        $appName = config('app.name', 'CoreDev Server Monitoring');

        if (! $request->hasValidSignature()) {
            $user = $this->resolveUserFromRequest($request);
            $this->auditService->log(
                AuthEventType::EmailVerificationFailed,
                $user?->id,
                ipAddress: $request->ip(),
                userAgent: $request->userAgent(),
                metadata: ['reason' => 'invalid_signature'],
            );

            return $this->renderStatus(
                false,
                'Verification Link Invalid',
                'This verification link is invalid or has expired. Please request a new one from your profile.',
                $appName,
            );
        }

        $user = User::where('uuid', $request->query('user'))->first();

        if (! $user) {
            $this->auditService->log(
                AuthEventType::EmailVerificationFailed,
                userId: null,
                ipAddress: $request->ip(),
                userAgent: $request->userAgent(),
                metadata: ['reason' => 'user_not_found'],
            );

            return $this->renderStatus(
                false,
                'Account Not Found',
                'The account associated with this link could not be found.',
                $appName,
            );
        }

        if ($user->email_verified_at !== null) {
            return $this->renderStatus(
                true,
                'Already Verified',
                'Your email address has already been verified. You can close this page.',
                $appName,
                $user->email_verified_at->toIso8601String(),
            );
        }

        $user->forceFill(['email_verified_at' => now()])->save();

        $this->auditService->log(
            AuthEventType::EmailVerified,
            $user->id,
            ipAddress: $request->ip(),
            userAgent: $request->userAgent(),
        );

        return $this->renderStatus(
            true,
            'Email Verified',
            'Your email address has been verified successfully. You can close this page and return to the app.',
            $appName,
            $user->email_verified_at->toIso8601String(),
        );
    }

    private function renderStatus(
        bool $success,
        string $title,
        string $message,
        string $appName,
        ?string $emailVerifiedAt = null,
    ): Response {
        if (request()->expectsJson()) {
            return response()->json([
                'message' => $message,
                'email_verified_at' => $emailVerifiedAt,
            ], $success ? 200 : 403);
        }

        return response()
            ->view('email-verification-status', [
                'success' => $success,
                'title' => $title,
                'message' => $message,
                'appName' => $appName,
            ])
            ->setStatusCode($success ? 200 : 403);
    }

    private function buildVerifyUrl(User $user): string
    {
        return URL::temporarySignedRoute(
            'email.verify',
            now()->addMinutes(60),
            ['user' => $user->uuid],
        );
    }

    private function resolveUserFromRequest(Request $request): ?User
    {
        $id = $request->query('user');

        return $id ? User::where('uuid', $id)->first() : null;
    }

    private function maskEmail(string $email): string
    {
        $parts = explode('@', $email);
        if (count($parts) !== 2) {
            return '*****@*****.**';
        }

        $name = $parts[0];
        $domain = $parts[1];

        if (strlen($name) <= 2) {
            $maskedName = str_repeat('*', strlen($name));
        } else {
            $maskedName = $name[0].str_repeat('*', strlen($name) - 2).$name[strlen($name) - 1];
        }

        return "{$maskedName}@{$domain}";
    }
}
