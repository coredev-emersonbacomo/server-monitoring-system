<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CustomActivityLog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = CustomActivityLog::where(function ($q) {
            $q->whereNull('type')->orWhere('type', 'activity');
        });

        return response()->json($this->paginateAndFormat($query, $request));
    }

    public function serverHealth(Request $request): JsonResponse
    {
        $query = CustomActivityLog::where('type', 'server_health');

        return response()->json($this->paginateAndFormat($query, $request));
    }

    public function agent(Request $request): JsonResponse
    {
        $query = CustomActivityLog::where('type', 'agent');

        return response()->json($this->paginateAndFormat($query, $request));
    }

    public function billing(Request $request): JsonResponse
    {
        $query = CustomActivityLog::where('type', 'billing');

        return response()->json($this->paginateAndFormat($query, $request));
    }

    private function paginateAndFormat(Builder $query, Request $request): array
    {
        // Filter by action
        if ($request->filled('action') && $request->action !== 'all') {
            $query->where('action', $request->action);
        }

        // Filter by user / actor
        if ($request->filled('user') && $request->user !== 'all') {
            if ($request->user === 'System') {
                $query->where(function ($q) {
                    $q->whereNull('user')->orWhere('user', 'System');
                });
            } else {
                $query->where('user', $request->user);
            }
        }

        // Filter by date range
        if ($request->filled('start_date')) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        // Search term across subject name, user, action, and JSON details
        if ($request->filled('search')) {
            $search = '%'.strtolower(trim($request->search)).'%';
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(action) LIKE ?', [$search])
                    ->orWhereRaw('LOWER(COALESCE(user, \'System\')) LIKE ?', [$search])
                    ->orWhereRaw('LOWER(COALESCE(logable_type, \'\')) LIKE ?', [$search])
                    ->orWhereRaw('LOWER(CAST(details AS TEXT)) LIKE ?', [$search]);
            });
        }

        // Sorting
        $sortField = $request->get('sort_field', 'created_at');
        $sortDir = strtolower($request->get('sort_dir', 'desc')) === 'asc' ? 'asc' : 'desc';

        if (in_array($sortField, ['created_at', 'action', 'user', 'logable_type'])) {
            $query->orderBy($sortField, $sortDir);
        } else {
            $query->latest();
        }

        $perPage = max(5, min(100, (int) $request->get('per_page', 15)));
        $paginator = $query->paginate($perPage);

        $items = $paginator->getCollection();
        $items->load('PerformerUser');

        $items->transform(function ($log) {
            if ($log->logable_type && class_exists($log->logable_type)) {
                try {
                    $subject = is_numeric($log->logable_id)
                        ? $log->logable_type::find($log->logable_id)
                        : $log->logable_type::where('uuid', $log->logable_id)->first();

                    if ($subject && isset($subject->uuid)) {
                        $log->logable_id = $subject->uuid;
                    }
                } catch (\Throwable $e) {
                    // fallback
                }
            }

            $log->setAttribute('user_uuid', $log->PerformerUser?->uuid);

            return $log;
        });

        return [
            'data' => $items,
            'current_page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'last_page' => $paginator->lastPage(),
        ];
    }
}
