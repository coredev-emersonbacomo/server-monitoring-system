<?php

use App\Services\WindowsCommand;
use Tests\TestCase;

uses(TestCase::class);

afterEach(function () {
    putenv('NGROK_SKIP_BROWSER_WARNING');
    unset($_ENV['NGROK_SKIP_BROWSER_WARNING'], $_SERVER['NGROK_SKIP_BROWSER_WARNING']);
});

function enableNgrokHeader(): void
{
    putenv('NGROK_SKIP_BROWSER_WARNING=true');
    $_ENV['NGROK_SKIP_BROWSER_WARNING'] = 'true';
    $_SERVER['NGROK_SKIP_BROWSER_WARNING'] = 'true';
}

test('windows command omits the ngrok interstitial header by default (prod-safe)', function () {
    $command = WindowsCommand::make('/install/windows.ps1', '-ProvisionToken', 'tok123', 'https://monitor.company.com');

    expect($command)
        ->toContain('powershell -ExecutionPolicy Bypass -Command "irm ')
        ->toContain("-ProvisionToken 'tok123'")
        ->not->toContain('ngrok-skip-browser-warning');
});

test('windows command sends the ngrok interstitial header when the tunnel flag is set', function () {
    enableNgrokHeader();

    $command = WindowsCommand::make('/install/windows.ps1', '-ProvisionToken', 'tok123', 'https://demo.ngrok-free.dev');

    expect($command)
        ->toContain('powershell -ExecutionPolicy Bypass -Command "irm ')
        ->toContain("-ProvisionToken 'tok123'")
        ->toContain("@{'ngrok-skip-browser-warning' = 'true'}");
});

test('the string "false" keeps the header off', function () {
    putenv('NGROK_SKIP_BROWSER_WARNING=false');
    $_ENV['NGROK_SKIP_BROWSER_WARNING'] = 'false';
    $_SERVER['NGROK_SKIP_BROWSER_WARNING'] = 'false';

    $command = WindowsCommand::make('/install/windows.ps1', '-ProvisionToken', 'tok123', 'https://monitor.company.com');

    expect($command)->not->toContain('ngrok-skip-browser-warning');
});
