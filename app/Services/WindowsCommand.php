<?php

namespace App\Services;

class WindowsCommand
{
    public static function make(string $scriptPath, string $token, string $appUrl): string
    {
        $fileName = str_contains($scriptPath, 'uninstall') ? 'monitor-uninstall.ps1' : 'monitor-install.ps1';

        return 'powershell -ExecutionPolicy Bypass -Command "irm \''.$appUrl.$scriptPath."' -OutFile \$env:TEMP\\$fileName; & \$env:TEMP\\$fileName -ProvisionToken '".$token."'\"";
    }
}
