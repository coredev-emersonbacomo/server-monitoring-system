<?php

namespace App\Auth;

use App\Services\JwtService;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Auth\Guard;
use Illuminate\Contracts\Auth\UserProvider;
use Illuminate\Http\Request;

class JwtGuard implements Guard
{
    private ?Authenticatable $user = null;

    private ?string $sessionUuid = null;

    private ?array $jwtPayload = null;

    private bool $validated = false;

    public function __construct(
        private UserProvider $provider,
        private JwtService $jwtService,
        private Request $request,
    ) {}

    public function user(): ?Authenticatable
    {
        if ($this->validated) {
            return $this->user;
        }

        $this->authenticate();

        return $this->user;
    }

    public function id(): mixed
    {
        return $this->user?->getAuthIdentifier();
    }

    public function validate(array $credentials = []): bool
    {
        if (empty($credentials['token'])) {
            return false;
        }

        $payload = $this->jwtService->validateAccessToken($credentials['token']);
        if (! $payload) {
            return false;
        }

        $user = $this->provider->retrieveById($payload->sub);
        if (! $user) {
            return false;
        }

        $this->user = $user;
        $this->sessionUuid = $payload->sid;
        $this->jwtPayload = (array) $payload;
        $this->validated = true;

        return true;
    }

    public function hasUser(): bool
    {
        return $this->user !== null;
    }

    public function setUser(Authenticatable $user): void
    {
        $this->user = $user;
        $this->validated = true;
    }

    public function check(): bool
    {
        return $this->user() !== null;
    }

    public function guest(): bool
    {
        return ! $this->check();
    }

    public function getSessionUuid(): ?string
    {
        $this->user();

        return $this->sessionUuid;
    }

    public function getJwtPayload(): ?array
    {
        $this->user();

        return $this->jwtPayload;
    }

    private function authenticate(): void
    {
        $this->validated = true;

        $token = $this->extractToken();
        if (! $token) {
            return;
        }

        $payload = $this->jwtService->validateAccessToken($token);
        if (! $payload) {
            return;
        }

        $user = $this->provider->retrieveById($payload->sub);
        if (! $user) {
            return;
        }

        $this->user = $user;
        $this->sessionUuid = $payload->sid;
        $this->jwtPayload = (array) $payload;
    }

    private function extractToken(): ?string
    {
        $header = $this->request->header('Authorization');
        if ($header && str_starts_with($header, 'Bearer ')) {
            return substr($header, 7);
        }

        return null;
    }
}
