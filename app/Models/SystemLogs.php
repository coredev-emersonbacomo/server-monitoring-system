<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SystemLogs extends Model
{
    protected $table = "systemlogs";
    public function activity(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(\App\Models\CustomActivityLog::class, 'subject');
    }
}
