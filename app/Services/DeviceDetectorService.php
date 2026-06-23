<?php

namespace App\Services;

use App\Enums\DeviceType;

class DeviceDetectorService
{
    private const BROWSER_PATTERNS = [
        'Edg' => 'Edge',
        'OPR' => 'Opera',
        'Opera' => 'Opera',
        'Chrome' => 'Chrome',
        'Firefox' => 'Firefox',
        'Safari' => 'Safari',
        'MSIE' => 'Internet Explorer',
        'Trident' => 'Internet Explorer',
    ];

    private const OS_PATTERNS = [
        'Windows NT 10.0' => 'Windows 10',
        'Windows NT 11.0' => 'Windows 11',
        'Windows NT 6.3' => 'Windows 8.1',
        'Windows NT 6.2' => 'Windows 8',
        'Windows NT 6.1' => 'Windows 7',
        'Mac OS X' => 'macOS',
        'Android' => 'Android',
        'like Mac OS X' => 'iOS',
        'Linux' => 'Linux',
        'CrOS' => 'ChromeOS',
    ];

    private const MOBILE_PATTERNS = [
        'Android.*Mobile',
        'iPhone',
        'iPod',
        'Windows Phone',
        'BlackBerry',
        'Opera Mini',
        'IEMobile',
    ];

    private const TABLET_PATTERNS = [
        'iPad',
        'Android(?!.*Mobile)',
        'Silk',
        'Tablet',
        'PlayBook',
    ];

    public function detectBrowser(?string $userAgent): ?string
    {
        if (!$userAgent) {
            return null;
        }

        foreach (self::BROWSER_PATTERNS as $pattern => $name) {
            if (str_contains($userAgent, $pattern)) {
                return $name;
            }
        }

        return null;
    }

    public function detectOperatingSystem(?string $userAgent): ?string
    {
        if (!$userAgent) {
            return null;
        }

        foreach (self::OS_PATTERNS as $pattern => $name) {
            if (str_contains($userAgent, $pattern)) {
                return $name;
            }
        }

        return null;
    }

    public function detectDeviceType(?string $userAgent): DeviceType
    {
        if (!$userAgent) {
            return DeviceType::Unknown;
        }

        foreach (self::TABLET_PATTERNS as $pattern) {
            if (preg_match("/$pattern/i", $userAgent)) {
                return DeviceType::Tablet;
            }
        }

        foreach (self::MOBILE_PATTERNS as $pattern) {
            if (preg_match("/$pattern/i", $userAgent)) {
                return DeviceType::Mobile;
            }
        }

        return DeviceType::Desktop;
    }

    public function detectDeviceName(?string $userAgent): ?string
    {
        if (!$userAgent) {
            return null;
        }

        $browser = $this->detectBrowser($userAgent);
        $os = $this->detectOperatingSystem($userAgent);

        if ($browser && $os) {
            return "$browser on $os";
        }

        if ($browser) {
            return $browser;
        }

        if ($os) {
            return $os;
        }

        return null;
    }
}
