<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServerUpdate extends Model
{
    use HasFactory;

    protected $guarded = [];

    public $incrementing = false;

    public function getKeyName(): string
    {
        return 'created_at';
    }

    public function server(): BelongsTo
    {
        return $this->belongsTo(Server::class, 'server_id');
    }

    protected function storage(): Attribute
    {
        return Attribute::make(
            get: fn ($value, $attributes) => $attributes['disk_usage'] ?? null,
            set: fn ($value) => ['disk_usage' => $value],
        );
    }
}
