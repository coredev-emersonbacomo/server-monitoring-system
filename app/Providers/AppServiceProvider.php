<?php

namespace App\Providers;

use App\Contracts\StorageProvider;
use App\Services\MediaUrlService;
use App\Services\StorageProviderFactory;
use App\Services\UploadIntentService;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(StorageProviderFactory::class, function () {
            return new StorageProviderFactory();
        });

        $this->app->singleton(UploadIntentService::class, function ($app) {
            return new UploadIntentService(
                $app->make(StorageProviderFactory::class),
            );
        });

        $this->app->singleton(MediaUrlService::class, function ($app) {
            return new MediaUrlService(
                $app->make(StorageProviderFactory::class),
            );
        });
    }

    public function boot(): void
    {
        $this->app->afterResolving(Schedule::class, function (Schedule $schedule) {
            $schedule->command('uploads:cleanup')->hourly();
            $schedule->command('uploads:consistency-check')->daily();
        });
    }
}

