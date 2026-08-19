<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequestLogger
{
    public function handle(Request $request, Closure $next): Response
    {
        $start = microtime(true);

        $response = $next($request);

        $duration = (microtime(true) - $start) * 1000;
        $method = str_pad($request->method(), 4, ' ');

        error_log(sprintf(
            '[php]   %s %s /%s %s ~ %.2fms',
            now()->format('Y-m-d H:i:s'),
            $method,
            $request->path(),
            $response->getStatusCode(),
            $duration,
        ));

        return $response;
    }
}
