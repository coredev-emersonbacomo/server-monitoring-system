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
        // The ngrok-skip-browser-warning header is only emitted when
        // NGROK_SKIP_BROWSER_WARNING is truthy (set by `npm run ngrok`, never
        // in prod): irm sends a browser-like UA, otherwise free-tier ngrok
        // serves its interstitial HTML and the "script" fails to parse.
        // FILTER_VALIDATE_BOOLEAN so the string "false" stays false.
        // Single-quoted hashtable: the one-liner runs inside an outer
        // double-quoted -Command string, where nested double quotes would be
        // consumed by Windows argv parsing and corrupt the hash literal.
        $ngrokHeader = filter_var(env('NGROK_SKIP_BROWSER_WARNING', false), FILTER_VALIDATE_BOOLEAN)
            ? ' -Headers @{\'ngrok-skip-browser-warning\' = \'true\'}'
            : '';

        return sprintf(
            'powershell -ExecutionPolicy Bypass -Command "irm \'%s%s\'%s -OutFile $env:TEMP\\%s; & $env:TEMP\\%s %s \'%s\'%s"',
            $appUrl,
            $scriptPath,
            $ngrokHeader,
            $fileName,
            $fileName,
            $argFlag,
            $argValue,
            $extra,
        );
    }
}
