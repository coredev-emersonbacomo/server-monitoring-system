<?php

namespace App\Http\Controllers\Api\V1;

use App\Data\ActivityLogData;
use App\Data\ActivityLogsQuery;
use App\Http\Controllers\Concerns\PaginatedResponse;
use App\Http\Controllers\Controller;
use App\Models\CustomActivityLog;
use App\Models\Server;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;

class ActivityLogController extends Controller
{
    use PaginatedResponse;

    public function index(ActivityLogsQuery $filters): JsonResponse
    {
        $query = CustomActivityLog::where(function ($q) {
            $q->whereNull('type')->orWhere('type', 'activity');
        });

        return $this->respond($query, $filters);
    }

    public function serverHealth(ActivityLogsQuery $filters): JsonResponse
    {
        $query = CustomActivityLog::where('type', 'server_health');

        return $this->respond($query, $filters);
    }

    public function agent(ActivityLogsQuery $filters): JsonResponse
    {
        $query = CustomActivityLog::where('type', 'agent');

        return $this->respond($query, $filters);
    }

    public function billing(ActivityLogsQuery $filters): JsonResponse
    {
        $query = CustomActivityLog::where('type', 'billing');

        return $this->respond($query, $filters);
    }

    private function respond(Builder $query, ActivityLogsQuery $filters): JsonResponse
    {
        $paginator = $this->applyFilters($query, $filters);
        $paginator->getCollection()->load('PerformerUser');

        return response()->json([
            'data' => $paginator->getCollection()->map(
                fn (CustomActivityLog $log) => ActivityLogData::fromModel($log)
            ),
            ...$this->paginationMeta($paginator),
        ]);
    }

    private function applyFilters(Builder $query, ActivityLogsQuery $filters): LengthAwarePaginator
    {
        if ($filters->action && $filters->action !== 'all') {
            $query->where('action', $filters->action);
        }

        if ($filters->server_uuid) {
            $server = Server::where('uuid', $filters->server_uuid)->first();
            if ($server) {
                $query->where(function ($q) use ($server) {
                    $q->where('logable_id', $server->id)
                        ->orWhere('logable_id', $server->uuid);
                });
            } else {
                $query->whereRaw('1 = 0');
            }
        }

        if ($filters->user && $filters->user !== 'all') {
            if ($filters->user === 'System') {
                $query->where(function ($q) {
                    $q->whereNull('user')->orWhere('user', 'System');
                });
            } else {
                $query->where('user', $filters->user);
            }
        }

        if ($filters->start_date) {
            $query->whereDate('created_at', '>=', $filters->start_date);
        }
        if ($filters->end_date) {
            $query->whereDate('created_at', '<=', $filters->end_date);
        }

        if ($filters->search) {
            $search = '%'.strtolower(trim($filters->search)).'%';
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(action) LIKE ?', [$search])
                    ->orWhereRaw('LOWER(COALESCE(user, \'System\')) LIKE ?', [$search])
                    ->orWhereRaw('LOWER(COALESCE(logable_type, \'\')) LIKE ?', [$search])
                    ->orWhereRaw('LOWER(CAST(details AS TEXT)) LIKE ?', [$search])
                    ->orWhereHas('PerformerUser', function ($uq) use ($search) {
                        $uq->where(function ($w) use ($search) {
                            $w->whereRaw('LOWER(first_name) LIKE ?', [$search])
                                ->orWhereRaw('LOWER(last_name) LIKE ?', [$search])
                                ->orWhereRaw('LOWER(username) LIKE ?', [$search])
                                ->orWhereRaw("LOWER(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) LIKE ?", [$search]);
                        });
                    });
            });
        }

        $sortField = $filters->sort_field ?? 'created_at';
        $sortDir = strtolower($filters->sort_dir ?? 'desc') === 'asc' ? 'asc' : 'desc';

        if (in_array($sortField, ['created_at', 'action', 'user', 'logable_type'])) {
            $query->orderBy($sortField, $sortDir);
        } else {
            $query->latest();
        }

        $perPage = max(5, min(100, (int) ($filters->per_page ?? 15)));

        return $query->paginate($perPage);
    }
}
