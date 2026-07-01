<?php

namespace App\Http\Controllers;

use App\Models\GlobalAlert;
use Illuminate\Http\Request;

class GlobalAlertController extends Controller
{
    public function index()
    {
        $alerts = GlobalAlert::all();
        return response()->json($alerts);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'alerts' => 'required|array',
            'alerts.*.metric' => 'required|string',
            'alerts.*.notification_channel' => 'required|string',
            'alerts.*.threshold' => 'required|numeric|min:0|max:100',
        ]);

        foreach ($validated['alerts'] as $alertData) {
            GlobalAlert::updateOrCreate(
                [
                    'metric' => $alertData['metric'],
                    'notification_channel' => $alertData['notification_channel']
                ],
                [
                    'threshold' => $alertData['threshold']
                ]
            );
        }

        return response()->json(['message' => 'Global alerts updated successfully']);
    }
}
