<?php

namespace App\Data;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\Attributes\MapInputName;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Attributes\Validation\MaxDigits;
use Spatie\LaravelData\Attributes\Validation\MinDigits;

class ServerUpdatesData extends Data
{
    public function __construct(
        #[Required]
        public int $server_id,

        #[Required]
        public string $token,

        #[Required]
        public int $timestamp,

        // Tell Spatie to look inside the 'cpu' array for 'load1'
        #[Required, MinDigits(0), MaxDigits(100), MapInputName('cpu.load1')]
        public float $cpu_usage,

        // Tell Spatie to look inside the 'memory' array for 'percent'
        #[Required, MinDigits(0), MaxDigits(100), MapInputName('memory.percent')]
        public float $memory_usage,

        // Tell Spatie to look inside the 'disk' array for 'percent'
        #[Required, MinDigits(0), MapInputName('disk.percent')]
        public float $storage,

        #[Required, MinDigits(0)]
        public int $uptime,

        // We can handle the network totals inside a custom mapping method below
        public int $network_rbytes,
        public int $network_tbytes
    ) {}

    /**
     * This prepares the data before validation runs, allowing us to compute
     * the total network bytes from the nested arrays.
     */
    public static function prepareForPipeline(array $properties): array
    {
        $totalRxBytes = 0;
        $totalTxBytes = 0;

        if (isset($properties['network']) && is_array($properties['network'])) {
            foreach ($properties['network'] as $interface) {
                $totalRxBytes += $interface['rx_bytes'] ?? 0;
                $totalTxBytes += $interface['tx_bytes'] ?? 0;
            }
        }

        // Inject our calculated totals into the payload so the constructor gets them
        $properties['network_rbytes'] = $totalRxBytes;
        $properties['network_tbytes'] = $totalTxBytes;

        return $properties;
    }
}
