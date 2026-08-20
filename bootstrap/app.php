<?php

use App\Http\Middleware\RequestLogger;
use Dotenv\Dotenv;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Bootstrap\LoadEnvironmentVariables;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [
            RequestLogger::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();

// .env holds personal overrides only (gitignored); the app config lives in
// .env.development (or .env.production). Load the base file first, then let
// .env override it so personal keys win. The default loader is pointed at a
// file that never exists so it does not re-load .env immutably afterwards.
$app->beforeBootstrapping(LoadEnvironmentVariables::class, function (Application $app): void {
    // phpunit.xml/.env.testing own the test environment. Never load the dev
    // files there — they point DB_DATABASE at the dev DB, so a RefreshDatabase
    // test (migrate:fresh) would wipe it.
    $appEnv = getenv('APP_ENV') ?: ($_SERVER['APP_ENV'] ?? '');
    $isTestCommand = $app->runningInConsole()
        && str_contains(implode(' ', $_SERVER['argv'] ?? []), 'artisan test');
    if (strtolower($appEnv) === 'testing' || $isTestCommand) {
        $app->loadEnvironmentFrom('.env.testing');

        return;
    }
    Dotenv::createMutable($app->environmentPath(), ['.env.development', '.env'], false)->load();
    $app->loadEnvironmentFrom('__app_env_injected__.env');
});

return $app;
