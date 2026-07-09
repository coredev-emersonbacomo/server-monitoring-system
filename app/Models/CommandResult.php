<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommandResult extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $casts = [
        'reported_at' => 'datetime',
    ];

    public function command(): BelongsTo
    {
        return $this->belongsTo(AgentCommand::class, 'command_id');
    }
}
