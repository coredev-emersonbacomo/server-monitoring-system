<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = ['key', 'value'];

    /**
     * Get the value of a setting by key, with an optional default.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        // ponytail: uncached this was 1 query per call — and ServerData calls
        // it per server per list row. Cache forever, bust in set().
        return Cache::rememberForever('setting:'.$key, function () use ($key, $default) {
            $setting = static::where('key', $key)->first();

            return $setting ? $setting->value : $default;
        });
    }

    /**
     * Set or update a setting by key.
     */
    public static function set(string $key, mixed $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
        Cache::forget('setting:'.$key);
    }
}
