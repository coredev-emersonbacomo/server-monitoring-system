<?php

namespace App\Exceptions;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Log\LogLevel;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class Handler extends ExceptionHandler
{
    protected $levels = [
        QueryException::class => LogLevel::ERROR,
    ];

    protected $dontReport = [
        //
    ];

    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    public function register(): void
    {
        // 404 — hide the model class name in production
        $this->renderable(function (ModelNotFoundException $e, $request) {
            if ($request->expectsJson()) {
                $model = class_basename($e->getModel());

                return response()->json([
                    'message' => "{$model} not found.",
                ], Response::HTTP_NOT_FOUND);
            }
        });

        // 403 — never leak policy/gate internals
        $this->renderable(function (AuthorizationException $e, $request) {
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'This action is unauthorized.',
                ], Response::HTTP_FORBIDDEN);
            }
        });

        // 500 — database errors: log real error, return safe message
        $this->renderable(function (QueryException $e, $request) {
            if ($request->expectsJson()) {
                Log::error('QueryException on API request', [
                    'url' => $request->fullUrl(),
                    'sql' => $e->getSql(),
                    'bindings' => $e->getBindings(),
                    'message' => $e->getMessage(),
                ]);

                return response()->json([
                    'message' => 'A database error occurred. Please try again.',
                ], Response::HTTP_INTERNAL_SERVER_ERROR);
            }
        });

        // 500 — catch-all: never leak internals on JSON API requests
        $this->renderable(function (\Throwable $e, $request) {
            // Let Laravel's built-in handlers deal with HTTP exceptions
            // (404, 405, 422, 429, etc.) and validation — they are already safe.
            if (! $request->expectsJson()) {
                return;
            }

            // HttpException carries getStatusCode(); ValidationException carries ->status
            $statusCode = match (true) {
                method_exists($e, 'getStatusCode') => $e->getStatusCode(),
                property_exists($e, 'status') => (int) $e->status,
                default => Response::HTTP_INTERNAL_SERVER_ERROR,
            };

            // 4xx are intentional and safe to pass through Laravel's default renderer
            if ($statusCode >= 400 && $statusCode < 500) {
                return;
            }

            Log::error('Unhandled exception on API request', [
                'url' => $request->fullUrl(),
                'exception' => get_class($e),
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'message' => 'An unexpected error occurred. Please try again.',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        });
    }
}
