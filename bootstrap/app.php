<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use App\Http\Middleware\RequestLogger;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        channels: __DIR__ . '/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Enables Sanctum's SPA authentication for the api/* routes.
        // Attaches three middleware in order:
        //   1. EncryptCookies        — encrypts/decrypts the laravel_session cookie so it cannot be tampered with
        //   2. AddQueuedCookies      — flushes any cookies queued during the request (e.g. the session cookie)
        //   3. StartSession          — boots the session from the laravel_session cookie on every request
        //   4. AuthenticateSession   — invalidates the session if the authenticated user no longer exists
        //   5. ValidateCsrfToken     — rejects any state-mutating request (POST/PUT/DELETE) that lacks a matching X-XSRF-TOKEN header
        //   6. SubstituteBindings    — resolves route model bindings
        // Without this, api/* routes are stateless by default and Auth::user() always returns null,
        // since Laravel does not start a session or validate CSRF tokens for API routes out of the cart.
        $middleware->statefulApi();
        $middleware->api(prepend: [
            RequestLogger::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn(Request $request) => $request->is('api/*'),
        );
    })->create();
