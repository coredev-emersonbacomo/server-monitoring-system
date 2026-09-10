<?php

namespace Tests\Feature;

use App\Data\StatPointData;
use App\Http\Controllers\Api\V1\ServerController;
use Tests\TestCase;

class ServerStatPaddingTest extends TestCase
{
    public function test_consecutive_minute_buckets_are_preserved(): void
    {
        $points = ServerController::padStatPointTimestamps(
            array_map(
                fn (array $p) => StatPointData::from($p),
                [
                    ['timestamp' => 1000, 'cpu' => 12.0, 'memory' => 40.0, 'netIn' => 0.5, 'netOut' => 0.2, 'disk' => 55.0, 'networks' => []],
                    ['timestamp' => 61_000, 'cpu' => 30.0, 'memory' => 50.0, 'netIn' => 1.0, 'netOut' => 0.4, 'disk' => 58.0, 'networks' => []],
                    ['timestamp' => 121_000, 'cpu' => 45.0, 'memory' => 55.0, 'netIn' => 2.0, 'netOut' => 0.8, 'disk' => 60.0, 'networks' => []],
                ]
            ),
            'server_updates_agg_minute'
        );

        $timestamps = collect($points)->pluck('timestamp')->all();

        expect($timestamps)->toBe([1000, 61_000, 121_000])
            ->and(count($points))->toBe(3);

        // All three real buckets survive untouched.
        expect($points[0]->cpu)->toBe(12.0)
            ->and($points[1]->cpu)->toBe(30.0)
            ->and($points[2]->cpu)->toBe(45.0);
    }

    public function test_insets_null_point_between_real_buckets(): void
    {
        $points = ServerController::padStatPointTimestamps(
            array_map(
                fn (array $p) => StatPointData::from($p),
                [
                    ['timestamp' => 1000, 'cpu' => 12.0, 'memory' => 40.0, 'netIn' => 0.5, 'netOut' => 0.2, 'disk' => 55.0, 'networks' => []],
                    ['timestamp' => 181_000, 'cpu' => 12.0, 'memory' => 40.0, 'netIn' => 0.5, 'netOut' => 0.2, 'disk' => 55.0, 'networks' => []],
                ]
            ),
            'server_updates_agg_minute'
        );

        expect(count($points))->toBe(4);

        $gap = $points[1];
        expect($gap->timestamp)->toBe(61_000)
            ->and($gap->cpu)->toBeNull()
            ->and($gap->memory)->toBeNull()
            ->and($gap->netIn)->toBeNull()
            ->and($gap->netOut)->toBeNull()
            ->and($gap->disk)->toBeNull()
            ->and($gap->networks)->toBe([]);
    }

    public function test_returns_empty_for_no_points(): void
    {
        expect(ServerController::padStatPointTimestamps([], 'server_updates_agg_minute'))->toBe([]);
    }

    public function test_padding_alignment_survives_out_of_order_input(): void
    {
        $points = ServerController::padStatPointTimestamps(
            array_map(
                fn (array $p) => StatPointData::from($p),
                [
                    ['timestamp' => 61_000, 'cpu' => 30.0, 'memory' => 50.0, 'netIn' => 1.0, 'netOut' => 0.4, 'disk' => 58.0, 'networks' => []],
                    ['timestamp' => 1000, 'cpu' => 12.0, 'memory' => 40.0, 'netIn' => 0.5, 'netOut' => 0.2, 'disk' => 55.0, 'networks' => []],
                ]
            ),
            'server_updates_agg_minute'
        );

        expect(collect($points)->pluck('timestamp')->all())->toBe([1000, 61_000])
            ->and(collect($points)->pluck('cpu')->all())->toBe([12.0, 30.0]);
    }
}
