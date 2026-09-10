<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

afterEach(function () {
    putenv('NGROK_SKIP_BROWSER_WARNING');
    unset($_ENV['NGROK_SKIP_BROWSER_WARNING'], $_SERVER['NGROK_SKIP_BROWSER_WARNING']);
});

function setNgrokSkip(string $value): void
{
    putenv("NGROK_SKIP_BROWSER_WARNING={$value}");
    $_ENV['NGROK_SKIP_BROWSER_WARNING'] = $value;
    $_SERVER['NGROK_SKIP_BROWSER_WARNING'] = $value;
}

test('windows install script bakes the tunnel header flag on when set', function () {
    setNgrokSkip('true');

    $response = $this->get('/install/windows.ps1');

    $response->assertOk();
    expect($response->getContent())
        ->not->toContain('{{NGROK_SKIP_BROWSER_WARNING}}')
        ->toContain('if ("true" -eq "true")');
});

test('windows install script leaves the tunnel header off by default (prod-safe)', function () {
    $response = $this->get('/install/windows.ps1');

    $response->assertOk();
    expect($response->getContent())
        ->not->toContain('{{NGROK_SKIP_BROWSER_WARNING}}')
        ->toContain('if ("false" -eq "true")');
});

test('linux install script bakes the tunnel header flag on when set', function () {
    setNgrokSkip('true');

    $response = $this->get('/install/linux');

    $response->assertOk();
    expect($response->getContent())
        ->not->toContain('{{NGROK_SKIP_BROWSER_WARNING}}')
        ->toContain('if [[ "true" == "true" ]]');
});

test('linux install script leaves the tunnel header off by default (prod-safe)', function () {
    $response = $this->get('/install/linux');

    $response->assertOk();
    expect($response->getContent())
        ->not->toContain('{{NGROK_SKIP_BROWSER_WARNING}}')
        ->toContain('if [[ "false" == "true" ]]');
});
