<?php

namespace App\Auth;

use App\Models\UserSession;
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

    public function setRequest(Request $request): self
    {
        $this->request = $request;
        $this->user = null;
        $this->sessionUuid = null;
        $this->jwtPayload = null;
        $this->validated = false;
        $this->currentToken = null;

        return $this;
    }

    private ?string $currentToken = null;

    public function user(): ?Authenticatable
    {
        // If the global request has changed (new HTTP request in tests or async context),
        // reset all cached state so revocation checks always run on a fresh request.
        $currentRequest = request();
        if ($currentRequest !== $this->request) {
            $this->setRequest($currentRequest);
        }

        $token = $this->extractToken();

        if ($this->user !== null && $token === null) {
            return $this->user;
        }

        if ($this->validated && $token !== null && $this->currentToken === $token) {
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
        $this->user = null;
        $this->sessionUuid = null;
        $this->jwtPayload = null;
        $this->currentToken = null;

        $token = $this->extractToken();
        if (! $token) {
            return;
        }

        $payload = $this->jwtService->validateAccessToken($token);
        if (! $payload) {
            return;
        }

        if (! empty($payload->sid)) {
            $sessionRevoked = UserSession::where('session_uuid', $payload->sid)
                ->where(function ($q) {
                    $q->whereNotNull('revoked_at')
                        ->orWhereNotNull('compromised_at');
                })
                ->exists();

            if ($sessionRevoked) {
                return;
            }
        }

        $user = $this->provider->retrieveById($payload->sub);
        if (! $user) {
            return;
        }

        $this->user = $user;
        $this->sessionUuid = $payload->sid;
        $this->jwtPayload = (array) $payload;
        $this->currentToken = $token;
    }

    private function extractToken(): ?string
    {
        $header = request()->header('Authorization') ?: $this->request->header('Authorization');
        if ($header && str_starts_with($header, 'Bearer ')) {
            return substr($header, 7);
        }

        return null;
    }
}
