<?php

namespace App\Http\Controllers;

use App\Data\LoginData;
use App\Data\UserData;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Authenticate user and initialize session
     */
    public function login(LoginData $data, Request $request): UserData
    {
        $this->ensureIsNotRateLimited($request);

        if (!Auth::attempt(['email' => $data->email, 'password' => $data->password])) {
            RateLimiter::hit($this->throttleKey($request));

            throw ValidationException::withMessages([
                'email' => "Invallid credentials.",
            ]);
        }

        RateLimiter::clear($this->throttleKey($request));

        $request->session()->regenerate();

        return UserData::from(Auth::user());
    }

    /**
     * Invalidate session and logout
     */
    public function logout(Request $request): Response
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }

    /**
     * Get the current authenticated user
     */
    public function me(Request $request): UserData
    {
        return UserData::from($request->user());
    }

    protected function ensureIsNotRateLimited(Request $request): void
    {
        if (!RateLimiter::tooManyAttempts($this->throttleKey($request), 5)) {
            return;
        }

        $seconds = RateLimiter::availableIn($this->throttleKey($request));

        throw ValidationException::withMessages([
            'email' => [
                'message' => 'Too many login attempts.',
                'retry_after_seconds' => $seconds,
                'available_at' => now()->addSeconds($seconds)->timestamp,
            ],
        ])->status(429);
    }

    protected function throttleKey(Request $request): string
    {
        return strtolower($request->input('email')) . '|' . $request->ip();
    }
}
