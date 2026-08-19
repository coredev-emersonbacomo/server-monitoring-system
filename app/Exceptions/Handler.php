<?php

namespace App\Exceptions;

use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Log\LogLevel;
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
        $this->renderable(function (ModelNotFoundException $e, $request) {
            if ($request->expectsJson()) {
                $model = class_basename($e->getModel());

                return response()->json([
                    'message' => "{$model} not found.",
                ], Response::HTTP_NOT_FOUND);
            }
        });
    }
}
