<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\hasMany;
use App\Models\Server;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Support\Str;
class Client extends Model
{
    use HasFactory, HasUuids;
public function newUniqueId(): string
    {
        return (string) Str::uuid7();
    }
    protected $fillable = [
        'name',
        'description',
        'location',
        'email',
        'contact_number',
        'banner_image_url',
        'banner_image_public_id',
        'status',
        'uuid',
    ];
public function uniqueIds(): array
    {
        return ['uuid'];
    }
    public function servers(): hasMany
    {
        return $this->hasMany(Server::class, 'client_id', 'id');
    }
    public function secopclients(): BelongsToMany
{
    return $this->belongsToMany(User::class, 'secop_client', 'client_id', 'user_id');
}
}
