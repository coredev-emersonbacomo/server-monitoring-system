<?php

namespace App\Http\Controllers;

use App\Models\GlobalAlert;
use Illuminate\Http\Request;

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
            'alerts' => ['required', 'array'],

            'alerts.*.metric' => ['required', 'string'],
            'alerts.*.name' => ['required', 'string'],
            'alerts.*.threshold' => ['required', 'integer', 'between:0,100'],
            'alerts.*.severity' => ['required', 'in:light,warning,critical'],
            'alerts.*.channels' => ['required', 'array'],
            'alerts.*.channels.*' => ['required', 'in:email,sms'],
            'alerts.*.enabled' => ['boolean'],
        ]);

        foreach ($validated['alerts'] as $alert) {

            GlobalAlert::updateOrCreate(
                [
                    'metric' => $alert['metric'],
                    'name'   => $alert['name'],
                ],
                [
                    'threshold' => $alert['threshold'],
                    'severity'  => $alert['severity'],
                    'channels'  => $alert['channels'],
                    'enabled'   => $alert['enabled'] ?? true,
                ]
            );
        }

        return response()->json([
            'message' => 'Global alerts updated successfully',
        ]);
    }
}