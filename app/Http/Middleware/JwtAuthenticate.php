<?php

namespace App\Http\Middleware;

use App\Auth\JwtGuard;
use Closure;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\Request;

class JwtAuthenticate
{
    public function handle(Request $request, Closure $next, ...$guards)
    {
        $guard = auth('jwt');

        if (! $guard instanceof JwtGuard) {
            throw new AuthenticationException('Invalid authentication guard');
        }

        if (! $guard->check()) {
            throw new AuthenticationException('Unauthenticated', guards: ['jwt']);
        }

        return $next($request);
    }
}
