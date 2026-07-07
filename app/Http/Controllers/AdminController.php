<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Models\User;

class AdminController extends Controller
{
    /**
     * Check if a user UUID has admin status.
     * 
     * @param string $uuid
     * @return JsonResponse
     */
    public function checkAdminStatus(string $uuid): JsonResponse
    {
        // Find the admin user by UUID
        // Adjust this based on how you're storing admin users
        // Option 1: If you have an 'admins' table
        // $isAdmin = \DB::table('admins')->where('user_uuid', $uuid)->exists();
        
        // If you have a specific admin UUID list
        $adminUuids = config('app.admin_uuids', []);
        $isAdmin = in_array($uuid, $adminUuids, true);
        
        // If you have an is_admin flag or admin_level field in users table
        // $isAdmin = User::where('uuid', $uuid)->where('is_admin', true)->exists();

        return response()->json([
            'is_admin' => $isAdmin,
            'uuid' => $uuid,
        ]);
    }
}