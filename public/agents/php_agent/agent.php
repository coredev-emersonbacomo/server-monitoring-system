<?php
$config = json_decode(
    file_get_contents(__DIR__ . '/config.json'),
    true
);

function cpuUsage()
{
    $load = sys_getloadavg();

    return [
        'load1' => $load[0],
        'load5' => $load[1],
        'load15' => $load[2]
    ];
}

function memoryUsage()
{
    $data = file('/proc/meminfo');

    $mem = [];

    foreach ($data as $line) {
        [$key, $value] = explode(':', $line);

        $mem[$key] = (int) filter_var($value, FILTER_SANITIZE_NUMBER_INT);
    }

    $total = $mem['MemTotal'];
    $available = $mem['MemAvailable'];

    $used = $total - $available;

    return [
        'total_kb' => $total,
        'used_kb' => $used,
        'free_kb' => $available,
        'percent' => round(($used / $total) * 100, 2)
    ];
}

function diskUsage()
{
    $total = disk_total_space("/");
    $free = disk_free_space("/");

    return [
        'total' => $total,
        'used' => $total - $free,
        'free' => $free,
        'percent' => round(
            (($total - $free) / $total) * 100,
            2
        )
    ];
}

function uptime()
{
    $uptime = trim(file_get_contents('/proc/uptime'));

    return (float) explode(' ', $uptime)[0];
}

function networkStats()
{
    $lines = file('/proc/net/dev');

    $stats = [];

    foreach ($lines as $line) {

        if (!str_contains($line, ':')) {
            continue;
        }

        [$iface, $data] = explode(':', $line);

        $parts = preg_split('/\s+/', trim($data));

        $stats[] = [
            'interface' => trim($iface),
            'rx_bytes' => $parts[0],
            'tx_bytes' => $parts[8]
        ];
    }

    return $stats;
}

function topProcesses()
{
    $output = shell_exec(
        'ps -eo pid,comm,%cpu,%mem --sort=-%cpu | head -6'
    );

    return explode("\n", trim($output));
}

$payload = [

    'server_id' =>
    $config['server_id'],

    'token' =>
    $config['token'],

    'timestamp' =>
    time(),

    'hostname' =>
    gethostname(),

    'cpu' =>
    cpuUsage(),

    'memory' =>
    memoryUsage(),

    'disk' =>
    diskUsage(),

    'uptime' =>
    uptime(),

    'network' =>
    networkStats(),

    'top_processes' =>
    topProcesses()
];

$ch = curl_init();

curl_setopt_array($ch, [

    CURLOPT_URL =>
    $config['api_url'],

    CURLOPT_POST =>
    true,

    CURLOPT_RETURNTRANSFER =>
    true,

    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json'
    ],

    CURLOPT_POSTFIELDS =>
    json_encode($payload)
]);

print_r($payload);

curl_exec($ch);

sleep(10);
