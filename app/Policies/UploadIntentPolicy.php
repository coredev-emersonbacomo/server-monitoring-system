<?php

namespace App\Policies;

use App\Models\UploadIntent;
use App\Models\User;

class UploadIntentPolicy
{
    public function view(User $user, UploadIntent $uploadIntent): bool
    {
        return $user->id === $uploadIntent->user_id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function delete(User $user, UploadIntent $uploadIntent): bool
    {
        return $user->id === $uploadIntent->user_id;
    }
}
