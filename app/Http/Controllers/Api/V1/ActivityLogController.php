<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;

class ActivityLogController extends Controller
{
    public function index()
    {
        $logs = ActivityLog::latest()->get();
        
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
