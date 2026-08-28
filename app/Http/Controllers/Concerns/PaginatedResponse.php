<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;

trait PaginatedResponse
{
    /**
     * Pagination meta for the standard envelope. `prev`/`next` are page numbers
     * (not URLs) so the client composes `?page=N` and OpenAPI can validate it.
     *
     * @return array{prev: ?int, next: ?int, total: int, per_page: int}
     */
    protected function paginationMeta(LengthAwarePaginator $paginator): array
    {
        return [
            'prev' => $paginator->currentPage() > 1 ? $paginator->currentPage() - 1 : null,
            'next' => $paginator->hasMorePages() ? $paginator->currentPage() + 1 : null,
            'total' => $paginator->total(),
            'per_page' => $paginator->perPage(),
        ];
    }
}
