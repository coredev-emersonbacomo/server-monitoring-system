<?php

namespace App\Services\Database;

use Illuminate\Database\Schema\PostgresSchemaState;
use Illuminate\Filesystem\Filesystem;
use Illuminate\Support\Collection;
use Tpetry\PostgresqlEnhanced\PostgresEnhancedConnection;

/**
 * pgsql connection whose schema dumps are scoped to the application's own
 * schemas. Without this, `schema:dump` pulls in TimescaleDB internals
 * (_timescaledb_catalog/_timescaledb_internal) and trips pg_dump's circular
 * foreign-key warning on continuous_agg.
 *
 * Registered in AppServiceProvider::boot() so it replaces the resolver set by
 * the postgresql-enhanced package while keeping its behaviour.
 */
class AppPostgresConnection extends PostgresEnhancedConnection
{
    public function getSchemaState(?Filesystem $files = null, ?callable $processFactory = null): PostgresSchemaState
    {
        return new class($this, $files, $processFactory, $this->dumpSchemas()) extends PostgresSchemaState
        {
            public function __construct($connection, ?Filesystem $files, ?callable $processFactory, private string $schemas)
            {
                parent::__construct($connection, $files, $processFactory);
            }

            protected function baseDumpCommand(): string
            {
                return parent::baseDumpCommand().' '.$this->schemas;
            }
        };
    }

    // first search_path entry only — add per-schema flags here if a
    // multi-schema search_path ever needs dumping.
    private function dumpSchemas(): string
    {
        return Collection::make(explode(',', (string) ($this->getConfig('search_path') ?: 'public')))
            ->map(fn (string $schema) => '--schema='.escapeshellarg(trim($schema)))
            ->implode(' ');
    }
}
