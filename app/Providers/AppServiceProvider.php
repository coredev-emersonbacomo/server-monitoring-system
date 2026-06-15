<?php

namespace App\Providers;

use Dedoc\Scramble\Scramble;
use Dedoc\Scramble\Support\Generator\OpenApi;
use Dedoc\Scramble\Support\Generator\Schema;
use Dedoc\Scramble\Support\Generator\Types\IntegerType;
use Dedoc\Scramble\Support\Generator\Types\ObjectType;
use Dedoc\Scramble\Support\Generator\Types\StringType;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Scramble::afterOpenApiGenerated(function (OpenApi $openApi) {
            // Manually define the UserData schema so Scramble emits correct property types.
            // This is needed because spatie/laravel-data's base class hides properties
            // from Scramble's static analyzer, causing it to fall back to additionalProperties.
            $type = new ObjectType;
            $type->addProperty('id', new IntegerType);
            $type->addProperty('name', new StringType);
            $type->addProperty('email', (new StringType)->format('email'));
            $type->setRequired(['id', 'name', 'email']);

            $openApi->components->schemas['UserData'] = Schema::fromType($type);
        });
    }
}

