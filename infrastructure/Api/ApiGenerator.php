<?php

namespace Infrastructure\Api;

class ApiGenerator {

    public static function GenerateApiKey(): string {
        // Returns exactly 43 characters
        return self::base64url_encode(random_bytes(32));
    }

    private static function base64url_encode(string $data) {
        // trim out some char, due to HTTP might unable to process those.
      return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    // Prevent being instansiated
    private function __construct() {}
}
