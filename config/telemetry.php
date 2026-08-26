<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Alert Visual Debugger
    |--------------------------------------------------------------------------
    |
    | When disabled (default), the real-time System Pipeline & Telemetry
    | Visualizer emits no events and its REST endpoint returns 404. This
    | keeps the backend silent for production while keeping the feature
    | one flag away from being re-enabled for local debugging.
    |
    */
    'enabled' => env('ALERTS_VISUAL_DEBUGGER', false),

];
