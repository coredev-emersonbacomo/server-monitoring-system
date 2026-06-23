<?php

namespace App\Providers;

use App\Auth\JwtGuard;
use App\Auth\JwtUserProvider;
use App\Models\User;
use App\Services\JwtService;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Auth;

class AuthServiceProvider extends ServiceProvider
{
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
