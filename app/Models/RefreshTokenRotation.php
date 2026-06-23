<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RefreshTokenRotation extends Model
{
    protected $table = 'refresh_token_rotations';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'rotated_at' => 'datetime',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(UserSession::class, 'session_id');
    }
}
