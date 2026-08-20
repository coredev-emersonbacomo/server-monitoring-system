<?php

use Illuminate\Support\Facades\DB;

test('debug which db', function () {
    $app = app();
    $lines = [
        'APP_ENV(app)= '.$app->environment(),
        'ENV_FILE= '.$app->environmentFilePath(),
        'DEFAULT_CONN= '.config('database.default'),
        'CONFIG_DB= '.config('database.connections.'.config('database.default').'.database'),
        'CONNECTED_DB= '.DB::connection()->getDatabaseName(),
        'ENV_DB= '.(getenv('DB_DATABASE') ?: 'unset'),
        'SERVER_APP_ENV= '.($_SERVER['APP_ENV'] ?? 'unset'),
    ];
    file_put_contents(base_path('storage/debug-db.txt'), implode("\n", $lines));
    expect(true)->toBeTrue();
});
