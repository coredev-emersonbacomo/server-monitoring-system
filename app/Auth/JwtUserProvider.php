<?php

namespace App\Auth;

use App\Models\User;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Auth\UserProvider;

class JwtUserProvider implements UserProvider
{
    public function __construct(
        private string $model,
    ) {}

    public function retrieveById($identifier): ?Authenticatable
    {
        return $this->createModel()->find($identifier);
    }

    public function retrieveByToken($identifier, $token): ?Authenticatable
    {
        return null;
    }

    public function updateRememberToken(Authenticatable $user, $token): void
    {
    }

    public function retrieveByCredentials(array $credentials): ?Authenticatable
    {
        if (empty($credentials['email'])) {
            return null;
        }

        return $this->createModel()->where('email', $credentials['email'])->first();
    }

    public function validateCredentials(Authenticatable $user, array $credentials): bool
    {
        if (empty($credentials['password'])) {
            return false;
        }

        return password_verify($credentials['password'], $user->getAuthPassword());
    }

    public function rehashPasswordIfRequired(Authenticatable $user, array $credentials, bool $force = false): void
    {
        if (!isset($credentials['password'])) {
            return;
        }

        $hashed = $user->getAuthPassword();
        if (password_needs_rehash($hashed, PASSWORD_BCRYPT)) {
            $user->forceFill([
                'password' => bcrypt($credentials['password']),
            ])->save();
        }
    }

    private function createModel(): User
    {
        $class = $this->model;
        return new $class;
    }
}
