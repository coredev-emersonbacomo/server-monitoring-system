<?php

namespace App\Http\Controllers;

use App\Models\SystemLogs;

class SystemLogController extends Controller
{
    public function index()
    {
        return SystemLogs::latest()->get();
    }
}
