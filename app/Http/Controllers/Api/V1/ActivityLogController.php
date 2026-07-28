<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CustomActivityLog;
use App\Models\ServerHealthLog;
use App\Models\AgentLog;

class ActivityLogController extends Controller
{
    public function index()
    {
        return $this->formatLogs(CustomActivityLog::latest()->get());
    }

    public function serverHealth()
    {
        return $this->formatLogs(ServerHealthLog::latest()->get());
    }

    public function agent()
    {
        return $this->formatLogs(AgentLog::latest()->get());
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
