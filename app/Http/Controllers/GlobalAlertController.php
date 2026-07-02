<?php

namespace App\Http\Controllers;

use App\Models\GlobalAlert;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GlobalAlertController extends Controller
{
    public function index()
    {
        return response()->json(
            GlobalAlert::orderBy('metric')
                ->orderBy('threshold')
                ->get()
        );
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'metrics' => ['required', 'array'],
        ]);
    
        DB::transaction(function () use ($validated) {
    
            foreach ($validated['metrics'] as $metric => $levels) {
    
                // Remove all existing levels for this metric
                GlobalAlert::where('metric', $metric)->delete();
    
                // Insert the new levels
                foreach ($levels as $level) {
    
                    GlobalAlert::create([
                        'metric' => $metric,
                        'name' => $level['name'],
                        'threshold' => $level['threshold'],
                        'severity' => $level['severity'],
                        'channels' => $level['channels'],
                        'enabled' => $level['enabled'] ?? true,
                    ]);
                }
            }
        });
    
        return response()->json([
            'message' => 'Global alerts updated successfully',
        ]);
    }
}