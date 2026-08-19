<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class ActivityLog extends Model
{
    protected $table = 'activity_logs';

    public function activity(): MorphMany
    {
        return $this->morphMany(CustomActivityLog::class, 'subject');
    }
}
