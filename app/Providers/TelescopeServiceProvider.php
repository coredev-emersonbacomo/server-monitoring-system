<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Laravel\Telescope\IncomingEntry;
use Laravel\Telescope\Telescope;
use Laravel\Telescope\TelescopeApplicationServiceProvider;

class TelescopeServiceProvider extends TelescopeApplicationServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Telescope is dev-only — completely disabled in production.
        // `npm start` (prod) uses .env.production with TELESCOPE_ENABLED=false
        // and APP_ENV=production, so Telescope::night() is called.
        if (! $this->app->environment('local') || ! config('telescope.enabled')) {
            Telescope::night();

            return;
        }

        $this->hideSensitiveRequestDetails();

        Telescope::filter(function (IncomingEntry $entry) {
            // In local with TELESCOPE_ENABLED=true, record everything.
            return true;
        });
    }

    /**
     * Prevent sensitive request details from being logged by Telescope.
     */
    protected function hideSensitiveRequestDetails(): void
    {
        if ($this->app->environment('local')) {
            return;
        }

        Telescope::hideRequestParameters(['_token']);

        Telescope::hideRequestHeaders([
            'cookie',
            'x-csrf-token',
            'x-xsrf-token',
        ]);
    }

    /**
     * Register the Telescope gate.
     *
     * This gate determines who can access Telescope in non-local environments.
     */
    protected function gate(): void
    {
        Gate::define('viewTelescope', function (User $user) {
            // Telescope is dev-only. In production the route is blocked by Telescope::night()
            // and by TELESCOPE_ENABLED=false, but as a second lock require local env.
            // If you must enable it in production, set TELESCOPE_ENABLED=true and
            // add admin emails here — never leave it open.
            if (! app()->environment('local')) {
                return false;
            }

            return true;
            // To admin-lock in production, use:
            // return in_array($user->email, explode(',', env('TELESCOPE_ADMIN_EMAILS', '')));
        });
    }
}
