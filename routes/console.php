<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('system:monitor')->everyMinute();
Schedule::command('tokens:cleanup')->hourly();
Schedule::command('agg:refresh')->everyMinute();
Schedule::command('node-tasks:process')->everyFiveSeconds();
