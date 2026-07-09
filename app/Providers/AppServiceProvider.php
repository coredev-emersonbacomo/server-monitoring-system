<?php

namespace App\Providers;

use App\Contracts\StorageProvider;
use App\Services\MediaUrlService;
use App\Services\StorageProviderFactory;
use App\Services\UploadIntentService;
use App\NodeConfig\Engine\NodeRegistry;
use App\NodeConfig\NodeTypes\ConditionNode;
use App\NodeConfig\NodeTypes\DelayNode;
use App\NodeConfig\NodeTypes\LogicNode;
use App\NodeConfig\NodeTypes\MetricNode;
use App\NodeConfig\NodeTypes\NotificationNode;
use App\NodeConfig\NodeTypes\RepeatNode;
use App\NodeConfig\NodeTypes\SustainedNode;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\ServiceProvider;

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
        $registry->register(new DelayNode);
        $registry->register(new SustainedNode);
        $registry->register(new RepeatNode);

        // Action nodes (merged notification)
        $registry->register(new NotificationNode);
    }

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

        $this->app->singleton(NodeRegistry::class, function () {
            $registry = new NodeRegistry();
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
    }
}
