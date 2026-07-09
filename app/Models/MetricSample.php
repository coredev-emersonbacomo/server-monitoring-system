<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MetricSample extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $guarded = [];

    protected $casts = [
        'recorded_at' => 'datetime',
        'value' => 'double',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(MetricBatch::class, 'batch_id');
    }
}
