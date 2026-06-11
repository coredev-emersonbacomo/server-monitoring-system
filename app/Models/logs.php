<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\SecOp;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class logs extends Model
{
    protected $table = "";
    public function secOp(): BelongsTo
    {
        return $this->belongsTo(SecOp::class, 'secops_id');
    }
}
