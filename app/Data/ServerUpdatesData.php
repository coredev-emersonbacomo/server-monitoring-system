<?php

namespace App\Data;

use Spatie\LaravelData\Attributes\MapInputName;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Data;

class ServerUpdatesData extends Data
{
    public function __construct(
        #[Required]
        public string $uuid,

        #[Required]
        public string $token,

        #[Required]
        public int $timestamp,

        // Tell Spatie to look inside the 'cpu' array for 'load1'
        #[Required, MapInputName('cpu.load1')]
        public float $cpu_usage,

        // Tell Spatie to look inside the 'memory' array for 'percent'
        #[Required, MapInputName('memory.percent')]
        public float $memory_usage,

        // Tell Spatie to look inside the 'disk' array for 'percent'
        #[Required, MapInputName('disk.percent')]
        public float $disk_usage,

        #[Required]
        public int $uptime,

        // We can handle the network totals inside a custom mapping method below
        #[Required, MapInputName('network.0.rx_bytes')]
        public int $network_rxbytes,
        #[Required, MapInputName('network.0.tx_bytes')]
        public int $network_txbytes
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
