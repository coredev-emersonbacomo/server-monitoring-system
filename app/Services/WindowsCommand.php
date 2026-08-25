<?php

namespace App\Services;

class WindowsCommand
{
    /**
     * Build a PowerShell one-liner that downloads a remote install/uninstall
     * script and runs it. The argument flag differs by intent:
     *  - install      → -ProvisionToken <token>
     *  - uninstall    → -Instance <installation_uuid>
     */
    public static function make(string $scriptPath, string $argFlag, string $argValue, string $appUrl, ?string $extraFlag = null, ?string $extraValue = null): string
    {
        $fileName = match (true) {
            str_contains($scriptPath, 'uninstall') => 'monitor-uninstall.ps1',
            str_contains($scriptPath, 'detach') => 'monitor-detach.ps1',
            default => 'monitor-install.ps1',
        };

        $extra = $extraFlag && $extraValue ? " {$extraFlag} '{$extraValue}'" : '';

        // argValue is single-quoted so the emitted -Command string always stays
        // balanced; $env:TEMP is left literal so PowerShell expands it at run time.
        return sprintf(
            'powershell -ExecutionPolicy Bypass -Command "irm \'%s%s\' -OutFile $env:TEMP\\%s; & $env:TEMP\\%s %s \'%s\'%s"',
            $appUrl,
            $scriptPath,
            $fileName,
            $fileName,
            $argFlag,
            $argValue,
            $extra,
        );
    }
}
