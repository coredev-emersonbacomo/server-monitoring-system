<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * Cursor (default) + offset pagination over an Eloquent query.
 *
 * Cursor mode is the default (no `page` param) and keys on $cursorColumns,
 * all ordered descending. It returns stable `next_cursor` / `previous_cursor`
 * tokens so the client composes `?cursor=` / `?previous_cursor=` without ever
 * materialising a total. Offset mode (`?page=N`) falls back to classic page
 * numbers and exposes `total` / `last_page` for the "jump to page" control.
 */
class HybridPaginator
{
    /**
     * @param  array<int,string>  $cursorColumns
     * @return array{items: Collection, pagination: array}
     */
    public function paginate(Builder $query, Request $request, array $cursorColumns = ['occurred_at', 'id']): array
    {
        $perPage = min(max((int) $request->query('per_page', 50), 1), 200);

        // Offset mode: explicit page request (used by the "jump to page" control).
        if ($request->filled('page')) {
            $page = max((int) $request->query('page', 1), 1);
            $paginator = $query->clone()
                ->orderByDesc($cursorColumns[0])
                ->orderByDesc($cursorColumns[1] ?? 'id')
                ->paginate($perPage, ['*'], 'page', $page);

            return [
                'items' => $paginator->getCollection(),
                'pagination' => [
                    'mode' => 'page',
                    'per_page' => $paginator->perPage(),
                    'has_previous' => $paginator->currentPage() > 1,
                    'has_next' => $paginator->hasMorePages(),
                    'total' => $paginator->total(),
                    'current_page' => $paginator->currentPage(),
                    'last_page' => $paginator->lastPage(),
                ],
            ];
        }

        $primary = $cursorColumns[0];
        $secondary = $cursorColumns[1] ?? 'id';

        // Backward navigation: previous_cursor points at the first row of the
        // current page; we fetch the page immediately before it.
        if ($request->filled('previous_cursor')) {
            $key = $this->decode((string) $request->query('previous_cursor'));

            $cloned = $query->clone();
            if ($key) {
                $this->applyAfter($cloned, $cursorColumns, $key);
            }
            $cloned->orderBy($primary)->orderBy($secondary);

            $rows = $cloned->limit($perPage + 1)->get();
            $hasEarlier = $rows->count() > $perPage;
            if ($hasEarlier) {
                $rows->pop();
            }
            $rows = $rows->reverse()->values();

            return $this->cursorResponse($rows, $perPage, $primary, $secondary, $hasEarlier, true);
        }

        // Forward navigation (default): cursor points at the last row of the
        // previous page; we fetch the page immediately after it.
        $key = $request->filled('cursor') ? $this->decode((string) $request->query('cursor')) : null;

        $cloned = $query->clone();
        if ($key) {
            $this->applyBefore($cloned, $cursorColumns, $key);
        }
        $cloned->orderByDesc($primary)->orderByDesc($secondary);

        $rows = $cloned->limit($perPage + 1)->get();
        $hasNext = $rows->count() > $perPage;
        if ($hasNext) {
            $rows->pop();
        }

        return $this->cursorResponse($rows, $perPage, $primary, $secondary, $key !== null, $hasNext);
    }

    /**
     * @param  Collection  $rows
     */
    private function cursorResponse($rows, int $perPage, string $primary, string $secondary, bool $hasPrevious, bool $hasNext): array
    {
        $first = $rows->first();
        $last = $rows->last();

        $previousCursor = ($hasPrevious && $first)
            ? $this->encode([$first->{$primary}, $first->{$secondary}])
            : null;
        $nextCursor = ($hasNext && $last)
            ? $this->encode([$last->{$primary}, $last->{$secondary}])
            : null;

        return [
            'items' => $rows,
            'pagination' => [
                'mode' => 'cursor',
                'per_page' => $perPage,
                'has_previous' => $previousCursor !== null,
                'has_next' => $nextCursor !== null,
                'next_cursor' => $nextCursor,
                'previous_cursor' => $previousCursor,
            ],
        ];
    }

    /**
     * Rows strictly before $key in the descending lexicographic order of $columns.
     */
    private function applyBefore(Builder $query, array $columns, array $key): void
    {
        $query->where(function ($q) use ($columns, $key) {
            $n = count($columns);
            for ($i = 0; $i < $n; $i++) {
                $q->orWhere(function ($qq) use ($columns, $key, $i) {
                    for ($j = 0; $j < $i; $j++) {
                        $qq->where($columns[$j], '=', $key[$j]);
                    }
                    $qq->where($columns[$i], '<', $key[$i]);
                });
            }
        });
    }

    /**
     * Rows strictly after $key (more recent) in the descending order of $columns.
     */
    private function applyAfter(Builder $query, array $columns, array $key): void
    {
        $query->where(function ($q) use ($columns, $key) {
            $n = count($columns);
            for ($i = 0; $i < $n; $i++) {
                $q->orWhere(function ($qq) use ($columns, $key, $i) {
                    for ($j = 0; $j < $i; $j++) {
                        $qq->where($columns[$j], '=', $key[$j]);
                    }
                    $qq->where($columns[$i], '>', $key[$i]);
                });
            }
        });
    }

    private function encode(array $key): string
    {
        return strtr(base64_encode(json_encode($key)), '+/=', '-_,');
    }

    private function decode(string $cursor): ?array
    {
        $json = base64_decode(strtr($cursor, '-_,', '+/='), true);
        if ($json === false) {
            return null;
        }
        $decoded = json_decode($json, true);

        return is_array($decoded) ? $decoded : null;
    }
}
