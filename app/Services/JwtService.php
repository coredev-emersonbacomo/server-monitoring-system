<?php

namespace App\Services;

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Str;

class JwtService
{
    private string $secret;

    private string $algo;

    private int $accessTtl;

    public function __construct()
    {
        $this->secret = Config::get('jwt.secret');
        $this->algo = Config::get('jwt.algo', 'HS256');
        $this->accessTtl = Config::get('jwt.access_ttl', 15);
    }

    public function generateAccessToken(int $userId, string $sessionUuid): string
    {
        $header = $this->base64urlEncode(json_encode([
            'alg' => $this->algo,
            'typ' => 'JWT',
        ]));

        $now = now()->timestamp;
        $payload = $this->base64urlEncode(json_encode([
            'sub' => $userId,
            'sid' => $sessionUuid,
            'iat' => $now,
            'exp' => $now + ($this->accessTtl * 60),
        ]));

        $signature = $this->base64urlEncode(
            hash_hmac('sha256', "$header.$payload", $this->secret, true)
        );

        return "$header.$payload.$signature";
    }

    public function validateAccessToken(string $token): ?object
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$header, $payload, $signature] = $parts;

        $expectedSignature = $this->base64urlEncode(
            hash_hmac('sha256', "$header.$payload", $this->secret, true)
        );

        if (! hash_equals($expectedSignature, $signature)) {
            return null;
        }

        $data = json_decode($this->base64urlDecode($payload));
        if (! $data || ! isset($data->exp) || ! isset($data->sub) || ! isset($data->sid)) {
            return null;
        }

        if ($data->exp < now()->timestamp) {
            return null;
        }

        return $data;
    }

    public function generateRefreshTokenId(): string
    {
        return (string) Str::ulid();
    }

    public function generateRefreshTokenSecret(): string
    {
        return bin2hex(random_bytes(32));
    }

    public function hashSecret(string $secret): string
    {
        return hash('sha256', $secret);
    }

    public function buildRefreshToken(string $tokenId, string $secret): string
    {
        return "$tokenId.$secret";
    }

    public function parseRefreshToken(string $token): ?array
    {
        $parts = explode('.', $token, 2);
        if (count($parts) !== 2) {
            return null;
        }

        return [
            'id' => $parts[0],
            'secret' => $parts[1],
        ];
    }

    public function constantTimeCompare(string $known, string $user): bool
    {
        return hash_equals($known, $user);
    }

    private function base64urlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private function base64urlDecode(string $data): string
    {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
