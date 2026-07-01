<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GlobalAlert extends Model
{
    protected $fillable = ['metric', 'threshold', 'notification_channel'];
    public $timestamps = false;
}
