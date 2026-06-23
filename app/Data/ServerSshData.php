<?php

namespace App\Data;

use Spatie\LaravelData\Data;
use Spatie\LaravelData\Attributes\Validation\Between;
use Spatie\LaravelData\Attributes\Validation\Ip;
use Spatie\LaravelData\Attributes\Validation\Max;
use Spatie\LaravelData\Attributes\Validation\Min;
use Spatie\LaravelData\Attributes\Validation\Regex;
use Spatie\LaravelData\Attributes\Validation\Required;
use Spatie\LaravelData\Attributes\Validation\Numeric;
use Spatie\LaravelData\Attributes\Validation\StringType;

class ServerSshData extends Data
{
    public function __construct(

        // Must be a valid IP address
        #[Required, Ip]
        public string $sshHost,

        // Valid port range
        #[Required, Numeric, Between(1, 65535)]
        public int $sshPort,

        // Basic SSH username rules
        #[Required, StringType, Max(32), Regex('/^[a-zA-Z0-9_-]+$/')]
        public string $sshUser,

        // Minimum password length
        #[Required, StringType, Min(8)]
        public string $sshPassword,

        // Alphanumeric server ID
        #[Required, StringType, Max(64), Regex('/^[a-zA-Z0-9_-]+$/')]
        public string $serverId,

        // Token minimum length
        #[Required, StringType, Min(16)]
        public string $apiToken,

    ) {}
}
