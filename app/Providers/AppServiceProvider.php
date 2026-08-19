<?php

namespace App\Providers;

use App\NodeConfig\Engine\NodeRegistry;
use App\NodeConfig\NodeTypes\CheckAfterNode;
use App\NodeConfig\NodeTypes\ConditionNode;
use App\NodeConfig\NodeTypes\LogicNode;
use App\NodeConfig\NodeTypes\MetricNode;
use App\NodeConfig\NodeTypes\NotificationNode;
use App\NodeConfig\NodeTypes\SeverityNode;
use App\NodeConfig\NodeTypes\SustainedNode;
use App\NodeConfig\NodeTypes\TemplateNode;
use App\Services\MediaUrlService;
use App\Services\StorageProviderFactory;
use App\Services\UploadIntentService;
use Illuminate\Broadcasting\Broadcasters\PusherBroadcaster;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\ServiceProvider;
use Pusher\Pusher;

class AppServiceProvider extends ServiceProvider
{
    private function registerNodeConfigNodes(NodeRegistry $registry): void
    {
        // Metric node (unified with dropdown)
        $registry->register(new MetricNode);

        // Condition nodes (merged)
        $registry->register(new ConditionNode);

        // Logic nodes (merged)
        $registry->register(new LogicNode);

        // Time nodes
        $registry->register(new CheckAfterNode);
        $registry->register(new SustainedNode);

        // Severity node
        $registry->register(new SeverityNode);

        // Template input node (parameterizes compare thresholds by a bare id)
        $registry->register(new TemplateNode);

        // Action nodes (merged notification)
        $registry->register(new NotificationNode);
    }

    public function register(): void
    {
        $this->app->singleton(StorageProviderFactory::class, function () {
            return new StorageProviderFactory;
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

        $this->app->singleton(NodeRegistry::class, function () {
            $registry = new NodeRegistry;
            $this->registerNodeConfigNodes($registry);

            return $registry;
        });
    }

    public function boot(): void
    {
        $this->app->afterResolving(Schedule::class, function (Schedule $schedule) {
            $schedule->command('uploads:cleanup')->hourly();
            $schedule->command('uploads:consistency-check')->daily();
        });

        $makePusherBroadcaster = function ($app, $config) {
            $options = $config['options'] ?? [];
            if (isset($config['client_options'])) {
                $options['client_options'] = $config['client_options'];
            }
            $pusher = new Pusher(
                $config['key'],
                $config['secret'],
                $config['app_id'],
                $options
            );

            return new class($pusher) extends PusherBroadcaster
            {
                public function broadcast(array $channels, $event, array $payload = [])
                {
                    try {
                        parent::broadcast($channels, $event, $payload);
                    } catch (\Throwable $e) {
                        Log::warning('[broadcaster] Broadcast failed: '.$e->getMessage());
                    }
                }
            };
        };

        Broadcast::extend('reverb', $makePusherBroadcaster);
        Broadcast::extend('pusher', $makePusherBroadcaster);
    }
}
