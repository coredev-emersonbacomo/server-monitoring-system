<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;

class ActivityLogController extends Controller
{
    public function index()
    {
        return ActivityLog::latest()->get();
    }
}
