<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\hasMany;
use App\Models\Server;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Client extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'location',
        'email',
        'contact_number',
        'banner_image_url',
        'banner_image_public_id',
        'status',
    ];

    public function servers(): hasMany
    {
        return $this->hasMany(Server::class, 'client_id');
    }
}
