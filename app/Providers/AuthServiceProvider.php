<?php

namespace App\Providers;

use App\Auth\JwtGuard;
use App\Auth\JwtUserProvider;
use App\Models\User;
use App\Services\JwtService;
use App\Models\UploadIntent;
use App\Policies\UploadIntentPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Auth;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        UploadIntent::class => UploadIntentPolicy::class,
    ];

    public function boot(): void
    {
        Auth::provider('jwt', function ($app, array $config) {
            return new JwtUserProvider($config['model']);
        });

        Auth::extend('jwt', function ($app, $name, array $config) {
            $provider = Auth::createUserProvider($config['provider'] ?? 'jwt');
            return new JwtGuard(
                $provider,
                $app->make(JwtService::class),
                $app->make('request'),
            );
        });
    }
}
