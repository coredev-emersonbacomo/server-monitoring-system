<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\AuthEventType;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuthAuditService;
use App\Services\NotificationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PasswordResetController extends Controller
{
    public function __construct(
        private readonly NotificationService $notificationService,
        private readonly AuthAuditService $auditService,
    ) {}

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|string|max:255',
        ]);

        $login = $request->input('email');
        $user = User::where('email', $login)->orWhere('username', $login)->first();

        if (! $user) {
            $this->auditService->log(
                AuthEventType::PasswordResetRequested,
                userId: null,
                ipAddress: $request->ip(),
                userAgent: $request->userAgent(),
                metadata: ['login' => $login, 'user_found' => false],
            );

            return response()->json([
                'message' => 'If an account with that email or username exists, a reset code has been sent.',
                'masked_email' => $this->maskEmail($login),
            ]);
        }

        // 60-second cooldown per email
        $existing = DB::table('password_reset_tokens')
            ->where('email', $user->email)
            ->first();

        if ($existing && $existing->created_at) {
            $lastSentAt = Carbon::parse($existing->created_at);
            $secondsElapsed = abs(now()->diffInSeconds($lastSentAt));

            if ($secondsElapsed < 60) {
                $secondsLeft = (int) ceil(60 - $secondsElapsed);
                $secondsLeft = max(1, min(60, $secondsLeft));

                return response()->json([
                    'message' => "Please wait {$secondsLeft} seconds before requesting a new code.",
                    'seconds_remaining' => $secondsLeft,
                    'masked_email' => $this->maskEmail($user->email),
                ], 429);
            }
        }

        $code = (string) random_int(100000, 999999);
        $codeHash = hash('sha256', $code);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            [
                'code' => $codeHash,
                'code_expires_at' => now()->addMinutes(10),
                'created_at' => now(),
            ]
        );

        $this->notificationService->sendPasswordResetCode($user->email, $code, 10);

        $this->auditService->log(
            AuthEventType::PasswordResetRequested,
            userId: $user->id,
            ipAddress: $request->ip(),
            userAgent: $request->userAgent(),
            metadata: ['login' => $login, 'user_found' => true],
        );

        return response()->json([
            'message' => 'If an account with that email or username exists, a reset code has been sent.',
            'masked_email' => $this->maskEmail($user->email),
        ]);
    }

    public function verifyCode(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|string|max:255',
            'code' => 'required|string|size:6',
        ]);

        $login = $request->input('email');
        $code = $request->input('code');
        $codeHash = hash('sha256', $code);

        $user = User::where('email', $login)->orWhere('username', $login)->first();

        if (! $user) {
            $this->auditService->log(
                AuthEventType::PasswordResetFailed,
                userId: null,
                ipAddress: $request->ip(),
                userAgent: $request->userAgent(),
                metadata: ['login' => $login, 'reason' => 'user_not_found'],
            );

            throw ValidationException::withMessages([
                'code' => ['Invalid or expired verification code.'],
            ]);
        }

        $record = DB::table('password_reset_tokens')
            ->where('email', $user->email)
            ->where('code', $codeHash)
            ->where('code_expires_at', '>', now())
            ->first();

        if (! $record) {
            $this->auditService->log(
                AuthEventType::PasswordResetFailed,
                userId: $user->id,
                ipAddress: $request->ip(),
                userAgent: $request->userAgent(),
                metadata: ['login' => $login, 'reason' => 'invalid_code'],
            );

            throw ValidationException::withMessages([
                'code' => ['Invalid or expired verification code.'],
            ]);
        }

        $resetToken = Str::random(64);
        $resetTokenHash = hash('sha256', $resetToken);

        DB::table('password_reset_tokens')
            ->where('email', $user->email)
            ->update([
                'reset_token' => $resetTokenHash,
                'reset_token_expires_at' => now()->addMinutes(15),
            ]);

        $this->auditService->log(
            AuthEventType::PasswordResetCodeVerified,
            userId: $user->id,
            ipAddress: $request->ip(),
            userAgent: $request->userAgent(),
        );

        return response()->json([
            'message' => 'Code verified successfully.',
            'reset_token' => $resetToken,
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'reset_token' => 'required|string|max:64',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $resetToken = $request->input('reset_token');
        $resetTokenHash = hash('sha256', $resetToken);

        $record = DB::table('password_reset_tokens')
            ->where('reset_token', $resetTokenHash)
            ->where('reset_token_expires_at', '>', now())
            ->first();

        if (! $record) {
            $this->auditService->log(
                AuthEventType::PasswordResetFailed,
                userId: null,
                ipAddress: $request->ip(),
                userAgent: $request->userAgent(),
                metadata: ['reason' => 'invalid_token'],
            );

            throw ValidationException::withMessages([
                'reset_token' => ['Invalid or expired reset token.'],
            ]);
        }

        $user = User::where('email', $record->email)->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'reset_token' => ['User not found.'],
            ]);
        }

        $user->update([
            'password' => Hash::make($request->input('password')),
        ]);

        DB::table('password_reset_tokens')
            ->where('email', $record->email)
            ->delete();

        $this->auditService->log(
            AuthEventType::PasswordResetCompleted,
            userId: $user->id,
            ipAddress: $request->ip(),
            userAgent: $request->userAgent(),
        );

        return response()->json([
            'message' => 'Password has been reset successfully.',
        ]);
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
