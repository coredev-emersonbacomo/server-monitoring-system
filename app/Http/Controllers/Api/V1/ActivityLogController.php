<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CustomActivityLog;

class ActivityLogController extends Controller
{
    public function index()
    {
        return $this->formatLogs(CustomActivityLog::where(function ($q) {
            $q->whereNull('type')->orWhere('type', 'activity');
        })->latest()->get());
    }

    public function serverHealth()
    {
        return $this->formatLogs(CustomActivityLog::where('type', 'server_health')->latest()->get());
    }

    public function agent()
    {
        return $this->formatLogs(CustomActivityLog::where('type', 'agent')->latest()->get());
    }

    public function billing()
    {
        return $this->formatLogs(CustomActivityLog::where('type', 'billing')->latest()->get());
    }

    private function formatLogs($logs)
    {
        $logs->transform(function ($log) {
            if ($log->logable_type && class_exists($log->logable_type)) {
                try {
                    $subject = $log->logable_type::find($log->logable_id);
                    if ($subject && isset($subject->uuid)) {
                        $log->logable_id = $subject->uuid;
                    }
                } catch (\Exception $e) {
                    // fallback
                }
            }

            return $log;
        });

        return $logs;
    }
}
