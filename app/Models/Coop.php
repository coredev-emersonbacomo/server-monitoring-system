<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\hasMany;
use App\Models\Server;

class Coop extends Model
{
    protected $fillable = [
        'name',
        'description',
        'location',
        'email',
        'contact_number',
        'banner_image_url',
        'status',
    ];

    public function servers(): hasMany
    {
        return $this->hasMany(Server::class, 'coop_id');
    }
}
