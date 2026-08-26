<?php

namespace App\Http\Controllers;

use App\Data\ClientReportData;
use App\Data\ClientServerSummaryData;
use App\Data\GeneralReportData;
use App\Data\GeneralServerSummaryData;
use App\Data\ServerMetricPointData;
use App\Data\ServerReportData;
use App\Data\ServerUptimeData;
use App\Enums\ServerHealth;
use App\Models\ActionItem;
use App\Models\Client;
use App\Models\LocalAlert;
use App\Models\Server;
use App\Models\Setting;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class ReportController extends Controller
{
    /**
     * Compile a Typst template to PDF and return the bytes.
     *
     * POST /api/v1/reports/compile
     *
     * Body JSON:
     *   template: "client" | "server" | "general" | "multi-client" | "multi-server"
     *   data: object (explicit report data, optional if uuid/uuids given)
     *   uuid: string (single entity uuid — auto-fetches data from DB)
     *   uuids: string[] (multiple entity uuids — auto-fetches, wraps as { items: [...] })
     *   paper: "a4" | "letter" (default: "a4")
     *   orientation: "landscape" | "portrait" (default: "portrait")
     *   hours: int (for server metrics window, default: 24)
     */
    public function compile(Request $request)
    {
        $request->validate([
            'template' => 'required|in:client,server,general,multi-client,multi-server',
            'data' => 'nullable|array',
            'uuid' => 'nullable|string',
            'uuids' => 'nullable|array',
            'uuids.*' => 'string',
            'paper' => 'nullable|in:a4,letter,legal',
            'orientation' => 'nullable|in:landscape,portrait',
            'hours' => 'nullable|integer|min:1|max:672',
            'refresh' => 'nullable|boolean',
        ]);

        $template = $request->input('template');
        $paper = $request->input('paper', 'a4');
        $orientation = $request->input('orientation', 'portrait');
        $hours = $request->integer('hours', 24);
        $refresh = $request->boolean('refresh');

        // Auto-fetch data from DB when uuid / uuids are provided
        if ($request->filled('uuids') && is_array($request->input('uuids'))) {
            $uuids = $request->input('uuids');
            $items = [];
            foreach ($uuids as $uuid) {
                $items[] = match ($template) {
                    'multi-server' => $this->buildServerData($uuid, $hours)->toArray(),
                    'multi-client' => $this->buildClientData($uuid)->toArray(),
                    default => [],
                };
            }
            $data = ['items' => $items];
        } elseif ($request->filled('uuid')) {
            $uuid = $request->input('uuid');
            $data = match ($template) {
                'server' => $this->buildServerData($uuid, $hours)->toArray(),
                'client' => $this->buildClientData($uuid)->toArray(),
                default => [],
            };
        } elseif ($template === 'general') {
            // General report always fetches its own data
            $data = $this->buildGeneralData()->toArray();
        } else {
            $data = $request->input('data', []);
        }

        // Add timestamp and layout settings
        $data['generated_at'] = now()->format('F j, Y H:i');
        $data['orientation'] = $orientation;
        $data['paper'] = $paper;
        $data['hours'] = $hours;

        // Build human-readable filename
        $dateStr = now()->format('m-d-Y');
        $entityName = $data['name'] ?? null;
        $filename = match ($template) {
            'server' => $entityName
                ? "Server - {$entityName} - {$dateStr}.pdf"
                : "Server Report - {$dateStr}.pdf",
            'client' => $entityName
                ? "Client - {$entityName} - {$dateStr}.pdf"
                : "Client Report - {$dateStr}.pdf",
            'general' => "System Report - {$dateStr}.pdf",
            'multi-server' => "Servers Report - {$dateStr}.pdf",
            'multi-client' => "Clients Report - {$dateStr}.pdf",
            default => "Report - {$dateStr}.pdf",
        };
        $filename = preg_replace('/[^\w\s\-\.]/', '', $filename);

        // Stable entity reference — determines which DB records feed the report
        $entityRef = match (true) {
            $template === 'general' => 'general',
            $request->filled('uuids') => ['uuids' => $this->sortUuids($request->input('uuids'))],
            $request->filled('uuid') => ['uuid' => $request->input('uuid')],
            default => ['data' => sha1(json_encode($this->filterNulls($request->input('data', []))))],
        };

        // Daily cache — the same report requested any time today reuses today's file
        $cacheKey = sha1(json_encode([
            'template' => $template,
            'entity' => $entityRef,
            'paper' => $paper,
            'orientation' => $orientation,
            'hours' => $hours,
            'date' => now()->toDateString(),
            'tpl_hash' => md5_file(resource_path("typst/{$template}-report.typ")),
            'base_hash' => md5_file(resource_path('typst/base.typ')),
        ]));

        $cacheDir = storage_path("app/typst/cache/{$cacheKey}");
        $cachedPdf = "{$cacheDir}/output.pdf";

        $this->pruneCache();

        if (! $refresh && File::exists($cachedPdf)) {
            return response(file_get_contents($cachedPdf), 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => "inline; filename=\"{$filename}\"",
                'X-Generated-At' => gmdate('c', filemtime($cachedPdf)),
                'X-Filename' => $filename,
            ]);
        }

        // Create temp working directory
        $workDir = storage_path('app/typst/work/'.Str::uuid());
        File::makeDirectory($workDir, 0755, true);

        try {
            // Write input data JSON (filter nulls so typst `at(key, default)` works)
            $cleanData = $this->filterNulls($data);
            File::put("{$workDir}/input.json", json_encode($cleanData, JSON_PRETTY_PRINT));

            // Copy template file
            $templateFile = resource_path("typst/{$template}-report.typ");
            if (! File::exists($templateFile)) {
                return response()->json(['error' => "Template '{$template}' not found"], 404);
            }
            File::copy($templateFile, "{$workDir}/{$template}-report.typ");

            // Copy base template
            $baseFile = resource_path('typst/base.typ');
            File::copy($baseFile, "{$workDir}/base.typ");

            // Copy logo asset
            $logoFile = resource_path('typst/coreDevLogo.png');
            if (File::exists($logoFile)) {
                File::copy($logoFile, "{$workDir}/coreDevLogo.png");
            }

            // Run Typst compile
            $outputPdf = "{$workDir}/output.pdf";
            $templateFile = "{$workDir}/{$template}-report.typ";
            $cmd = 'typst compile '
                .escapeshellarg($templateFile).' '
                .escapeshellarg($outputPdf)
                .' 2>&1';

            $output = [];
            $exitCode = 0;
            exec($cmd, $output, $exitCode);

            if ($exitCode !== 0) {
                return response()->json([
                    'error' => 'Typst compilation failed',
                    'details' => implode("\n", $output),
                ], 500);
            }

            if (! File::exists($outputPdf)) {
                return response()->json(['error' => 'PDF was not generated'], 500);
            }

            // Cache the result
            File::makeDirectory($cacheDir, 0755, true, true);
            File::copy($outputPdf, $cachedPdf);

            $pdfBytes = file_get_contents($outputPdf);

            return response($pdfBytes, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => "inline; filename=\"{$filename}\"",
                'X-Generated-At' => now()->toIso8601String(),
                'X-Filename' => $filename,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Report generation failed',
                'details' => $e->getMessage(),
            ], 500);
        } finally {
            if (File::isDirectory($workDir)) {
                File::deleteDirectory($workDir);
            }
        }
    }

    /**
     * GET /api/v1/reports/client/{uuid}
     * Returns raw JSON data for a client report (used by HTML preview).
     */
    public function clientReport(string $uuid)
    {
        return response()->json($this->buildClientData($uuid)->toArray());
    }

    /**
     * GET /api/v1/reports/general
     * Returns raw JSON data for the general/global report (used by HTML preview).
     */
    public function generalReport()
    {
        return response()->json($this->buildGeneralData()->toArray());
    }

    // ─── Private data builders ────────────────────────────────────────────────

    /**
     * Build server report data from DB — mirrors ServerReportController::show().
     */
    private function buildServerData(string $uuid, int $hours = 24): ServerReportData
    {
        $server = Server::with('client', 'agent')->withTrashed()->where('uuid', $uuid)->firstOrFail();

        $offlineThresholdSec = (int) Setting::get('offline_threshold', '15');
        if ($offlineThresholdSec >= 1000) {
            $offlineThresholdSec = intdiv($offlineThresholdSec, 1000);
        }

        $lastSeenAt = $server->agent?->last_seen_at;
        $health = Server::computeHealth($lastSeenAt, $offlineThresholdSec);
        $status = $health === ServerHealth::Online ? 'online' : 'offline';

        // Fetch server_updates for the requested window
        $updates = $server->updates()
            ->where('created_at', '>=', now()->subHours($hours))
            ->orderBy('created_at')
            ->get();

        $metrics = $updates->map(fn ($u) => ServerMetricPointData::from([
            'timestamp' => $u->created_at->toIso8601String(),
            'cpu_usage' => (float) $u->cpu_usage,
            'memory_usage' => (float) $u->memory_usage,
            'disk_usage' => (float) $u->disk_usage,
            'network_rbytes' => (int) ($u->network_rbytes ?? 0),
            'network_tbytes' => (int) ($u->network_tbytes ?? 0),
        ]));

        // Fetch aggregated stats for the requested window
        $aggTable = $hours >= 168 ? 'server_updates_agg_day' : 'server_updates_agg_hour';

        try {
            $aggData = DB::table($aggTable)
                ->selectRaw('cpu, memory, disk, timestamp')
                ->where('server_id', $server->id)
                ->where('timestamp', '>=', now()->subHours($hours))
                ->orderBy('timestamp')
                ->get();
        } catch (\Throwable $e) {
            if (str_contains($e->getMessage(), 'has not been populated')) {
                DB::statement("REFRESH MATERIALIZED VIEW {$aggTable}");
                $aggData = DB::table($aggTable)
                    ->selectRaw('cpu, memory, disk, timestamp')
                    ->where('server_id', $server->id)
                    ->where('timestamp', '>=', now()->subHours($hours))
                    ->orderBy('timestamp')
                    ->get();
            } else {
                throw $e;
            }
        }

        $cpu7d = [];
        $memory7d = [];
        $disk7d = [];
        $trendX = [];

        foreach ($aggData as $row) {
            $cpu7d[] = round((float) $row->cpu, 1);
            $memory7d[] = round((float) $row->memory, 1);
            $disk7d[] = round((float) $row->disk, 1);
            $dt = Carbon::parse((string) $row->timestamp);
            $trendX[] = [$dt->year, $dt->month, $dt->day, $dt->hour, $dt->minute, (int) $dt->second];
        }

        return ServerReportData::from([
            'uuid' => $server->uuid,
            'name' => $server->name,
            'description' => $server->description,
            'client_name' => $server->client?->name,
            'host_name' => $server->host_name,
            'cpu_model' => $server->cpu_model,
            'cpu_cores' => $server->cpu_cores,
            'ram' => $server->ram,
            'disk' => $server->disk,
            'operating_system' => $server->operating_system,
            'status' => $status,
            'last_seen' => $lastSeenAt?->toIso8601String(),
            'metrics' => $metrics,
            'uptime' => $this->calcUptime($server, $updates, $hours),
            'cpu_7d' => $cpu7d,
            'memory_7d' => $memory7d,
            'disk_7d' => $disk7d,
            'subscription_fee' => $server->subscription_fee,
            'trend_x' => $trendX,
        ]);
    }

    /**
     * Build client report data from DB.
     */
    private function buildClientData(string $uuid): ClientReportData
    {
        $client = Client::with([
            'servers' => fn ($q) => $q->withTrashed(),
            'servers.agent',
            'servers.latestUpdate',
        ])->where('uuid', $uuid)->firstOrFail();

        $offlineThresholdSec = (int) Setting::get('offline_threshold', '15');
        if ($offlineThresholdSec >= 1000) {
            $offlineThresholdSec = intdiv($offlineThresholdSec, 1000);
        }

        $onlineCount = 0;
        $offlineCount = 0;
        $cpuSum = 0.0;
        $memSum = 0.0;
        $cpuCount = 0;
        $servers = [];
        $totalSubscriptionFee = 0;

        foreach ($client->servers as $server) {
            $lastSeenAt = $server->agent?->last_seen_at;
            $health = Server::computeHealth($lastSeenAt, $offlineThresholdSec);
            $isOnline = $health === ServerHealth::Online;

            if ($isOnline) {
                $onlineCount++;
            } else {
                $offlineCount++;
            }

            $cpu = $server->latestUpdate ? (float) $server->latestUpdate->cpu_usage : null;
            $mem = $server->latestUpdate ? (float) $server->latestUpdate->memory_usage : null;
            $disk = $server->latestUpdate ? (float) $server->latestUpdate->disk_usage : null;

            if ($cpu !== null) {
                $cpuSum += $cpu;
                $memSum += $mem ?? 0;
                $cpuCount++;
            }

            $diskSizeGb = null;
            if ($server->disk !== null) {
                $parsedDisk = preg_replace('/[^0-9.]/', '', $server->disk);
                if ($parsedDisk !== '' && is_numeric($parsedDisk)) {
                    $diskSizeGb = (float) $parsedDisk;
                }
            }

            // Per-server uptime: quick gap analysis over last 24h
            $updates = $server->updates()
                ->where('created_at', '>=', now()->subHours(24))
                ->orderBy('created_at')
                ->get();

            // Total the subscription fee
            $totalSubscriptionFee += $server->subscription_fee;

            $uptime = $this->calcUptime($server, $updates, 24);

            $servers[] = new ClientServerSummaryData(
                uuid: $server->uuid,
                name: $server->name,
                status: $isOnline ? 'online' : 'offline',
                cpu_model: $server->cpu_model,
                cpu_cores: $server->cpu_cores,
                ram: $server->ram,
                disk: $server->disk,
                disk_used_gb: $diskSizeGb !== null && $disk !== null ? round($diskSizeGb * $disk / 100, 1) : null,
                cpu_usage: $cpu,
                memory_usage: $mem,
                disk_usage: $disk,
                subscription_fee: $server->subscription_fee,
                last_seen: $lastSeenAt?->toIso8601String(),
                uptime_percentage: $uptime->uptime_percentage,
                uptime_hours: $uptime->uptime_hours,
                range_hours: $uptime->range_hours,
            );
        }

        $serverIds = $client->servers->pluck('id');
        $totalAlerts = $serverIds->isNotEmpty()
            ? LocalAlert::whereIn('server_id', $serverIds)->count()
            : 0;

        return new ClientReportData(
            uuid: $client->uuid,
            name: $client->name,
            email: $client->email,
            location: $client->location,
            contact: $client->contact_number,
            total_servers: $client->servers->count(),
            online_servers: $onlineCount,
            offline_servers: $offlineCount,
            avg_cpu_usage: $cpuCount > 0 ? round($cpuSum / $cpuCount, 1) : null,
            avg_memory_usage: $cpuCount > 0 ? round($memSum / $cpuCount, 1) : null,
            total_alerts: $totalAlerts,
            budget: $client->budget,
            total_subscription_fee: $totalSubscriptionFee,
            servers: $servers,
        );
    }

    /**
     * Build general/global report data from DB.
     */
    private function buildGeneralData(): GeneralReportData
    {
        $offlineThresholdSec = (int) Setting::get('offline_threshold', '15');
        if ($offlineThresholdSec >= 1000) {
            $offlineThresholdSec = intdiv($offlineThresholdSec, 1000);
        }

        // Direct database aggregations
        $totalClients = Client::count();
        $totalUsers = User::count();
        $sumClientBudget = (float) Client::sum('budget');

        // Load servers with eager-loaded latest relation and pre-filtered updates for the last 24h (prevents N+1)
        $since24h = now()->subHours(24);
        $servers = Server::with([
            'client:id,name',
            'agent:id,server_id,last_seen_at',
            'latestUpdate',
            'updates' => fn ($q) => $q->where('created_at', '>=', $since24h)->orderBy('created_at'),
        ])->get();

        $totalServers = $servers->count();
        $sumServerSubscriptionFee = (float) $servers->sum('subscription_fee');

        $onlineCount = 0;
        $offlineCount = 0;
        $cpuVals = [];
        $memVals = [];
        $diskVals = [];
        $serverSummaries = [];

        foreach ($servers as $server) {
            $lastSeenAt = $server->agent?->last_seen_at;
            $health = Server::computeHealth($lastSeenAt, $offlineThresholdSec);
            $isOnline = $health === ServerHealth::Online;

            if ($isOnline) {
                $onlineCount++;
            } else {
                $offlineCount++;
            }

            $cpu = $server->latestUpdate ? (float) $server->latestUpdate->cpu_usage : null;
            $mem = $server->latestUpdate ? (float) $server->latestUpdate->memory_usage : null;
            $disk = $server->latestUpdate ? (float) $server->latestUpdate->disk_usage : null;

            if ($cpu !== null) {
                $cpuVals[] = $cpu;
                $memVals[] = $mem ?? 0;
                $diskVals[] = $disk ?? 0;
            }

            // Uses preloaded relation directly without firing new database queries
            $uptime = $this->calcUptime($server, $server->updates, 24);

            $serverSummaries[] = new GeneralServerSummaryData(
                uuid: $server->uuid,
                name: $server->name,
                client_name: $server->client?->name ?? '—',
                status: $isOnline ? 'online' : 'offline',
                cpu_usage: $cpu ?? 0,
                memory_usage: $mem ?? 0,
                uptime_percentage: $uptime->uptime_percentage,
                uptime_hours: $uptime->uptime_hours,
                range_hours: $uptime->range_hours,
            );
        }

        // Sort servers needing attention by highest CPU usage (descending)
        $needAttention = $serverSummaries;
        usort($needAttention, fn ($a, $b) => $b->cpu_usage <=> $a->cpu_usage);
        $needAttention = array_values(array_slice($needAttention, 0, 5));

        // SLA servers: sorted by uptime_percentage desc, top 10
        $slaSorted = $serverSummaries;
        usort($slaSorted, fn ($a, $b) => $b->uptime_percentage <=> $a->uptime_percentage);
        $slaServers = array_values(array_slice($slaSorted, 0, 10));

        // Active alert counts per client
        $clientAlertCounts = LocalAlert::selectRaw('server_id')
            ->with('server:id,client_id')
            ->get()
            ->groupBy(fn ($a) => $a->server?->client_id);

        $clients = Client::withCount('servers')->get();
        $serversPerClient = $clients->map(function ($client) use ($clientAlertCounts) {
            $alerts = isset($clientAlertCounts[$client->id])
                ? $clientAlertCounts[$client->id]->count()
                : 0;

            return [
                'client_name' => $client->name,
                'server_count' => $client->servers_count,
                'active_alerts' => $alerts,
            ];
        })->values()->all();

        $thirtyDaysAgo = now()->subDays(30);

        $recentClients = Client::where('created_at', '>=', $thirtyDaysAgo)
            ->latest()
            ->get()
            ->map(fn ($c) => [
                'name' => $c->name,
                'email' => $c->email,
                'phone' => $c->contact_number ?? '—',
                'created_at' => $c->created_at->toIso8601String(),
            ])
            ->values()
            ->all();

        $recentServers = Server::with('client:id,name')
            ->where('created_at', '>=', $thirtyDaysAgo)
            ->latest()
            ->get()
            ->map(fn ($s) => [
                'name' => $s->name,
                'assigned_client' => $s->client?->name ?? '—',
                'hostname' => $s->host_name,
                'created_at' => $s->created_at->toIso8601String(),
            ])
            ->values()
            ->all();

        // Consolidated single query for ActionItems alert counts
        $alertMetrics = ActionItem::where('status', '!=', 'completed')
            ->selectRaw("
            COUNT(*) as total,
            SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical,
            SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END) as warning
        ")
            ->first();

        $totalAlerts = (int) ($alertMetrics->total ?? 0);
        $criticalAlerts = (int) ($alertMetrics->critical ?? 0);
        $warningAlerts = (int) ($alertMetrics->warning ?? 0);

        $avgCpu = count($cpuVals) > 0 ? round(array_sum($cpuVals) / count($cpuVals), 1) : 0;
        $avgMem = count($memVals) > 0 ? round(array_sum($memVals) / count($memVals), 1) : 0;
        $avgDisk = count($diskVals) > 0 ? round(array_sum($diskVals) / count($diskVals), 1) : 0;

        $uptimeVals = array_map(fn ($s) => $s->uptime_percentage, $serverSummaries);
        $avgUptime = count($uptimeVals) > 0 ? round(array_sum($uptimeVals) / count($uptimeVals), 1) : 0;

        return new GeneralReportData(
            report_title: 'Global Report',
            report_subtitle: 'System-wide overview of all clients and servers',
            total_servers: $totalServers,
            total_clients: $totalClients,
            total_users: $totalUsers,
            online_servers: $onlineCount,
            offline_servers: $offlineCount,
            total_alerts: $totalAlerts,
            critical_alerts: $criticalAlerts,
            warning_alerts: $warningAlerts,
            avg_uptime_percentage: $avgUptime,
            avg_cpu_usage: $avgCpu,
            avg_memory_usage: $avgMem,
            avg_disk_usage: $avgDisk,
            sum_client_budget: $sumClientBudget,
            sum_server_subscription_fee: $sumServerSubscriptionFee,
            need_attention_servers: $needAttention,
            sla_servers: $slaServers,
            servers_per_client: $serversPerClient,
            recent_clients: $recentClients,
            recent_servers: $recentServers,
        );
    }

    /**
     * Calculate uptime stats from a collection of ServerUpdate records.
     */
    private function calcUptime(Server $server, $updates, int $rangeHours): ServerUptimeData
    {
        $heartbeatIntervalMinutes = 5;
        $gapMultiplier = 3;
        $gapThreshold = $heartbeatIntervalMinutes * $gapMultiplier;

        $now = now();
        $rangeStart = $now->copy()->subHours($rangeHours);

        // Handle total absence of updates in the range
        if ($updates->isEmpty()) {
            return ServerUptimeData::from([
                'uptime_seconds' => $server->uptime_seconds ?? 0,
                'uptime_percentage' => 0.0,
                'outage_count' => 1,
                'last_downtime' => $rangeStart->toIso8601String(),
                'uptime_hours' => 0.0,
                'range_hours' => $rangeHours,
            ]);
        }

        $outageMinutes = 0;
        $outageCount = 0;
        $lastDowntime = null;

        // Sort updates chronologically just in case
        $sortedUpdates = $updates->sortBy('created_at');

        // Check initial gap (Range Start -> First Update)
        $firstUpdateAt = $sortedUpdates->first()->created_at;
        $initialGap = abs($rangeStart->diffInMinutes($firstUpdateAt, false));
        if ($initialGap > $gapThreshold) {
            $outageMinutes += $initialGap;
            $outageCount++;
            $lastDowntime = $firstUpdateAt->toIso8601String();
        }

        // Check gaps between consecutive updates
        $prev = $firstUpdateAt;
        foreach ($sortedUpdates->skip(1) as $update) {
            $gap = abs($prev->diffInMinutes($update->created_at));
            if ($gap > $gapThreshold) {
                $outageMinutes += $gap;
                $outageCount++;
                $lastDowntime = $update->created_at->toIso8601String();
            }
            $prev = $update->created_at;
        }

        // Check trailing gap (Last Update -> Now)
        $lastUpdateAt = $sortedUpdates->last()->created_at;
        $finalGap = abs($lastUpdateAt->diffInMinutes($now));
        if ($finalGap > $gapThreshold) {
            $outageMinutes += $finalGap;
            $outageCount++;
            $lastDowntime = $now->toIso8601String();
        }

        // Calculate percentage with safety caps
        $totalMinutes = $rangeHours * 60;

        // Cap outage minutes so it doesn't exceed total requested range
        $effectiveOutageMinutes = min($outageMinutes, $totalMinutes);

        $uptimePercentage = $totalMinutes > 0
            ? round((($totalMinutes - $effectiveOutageMinutes) / $totalMinutes) * 100, 2)
            : 0;

        return ServerUptimeData::from([
            'uptime_seconds' => $server->uptime_seconds ?? 0,
            'uptime_percentage' => max(0, min(100, $uptimePercentage)),
            'outage_count' => $outageCount,
            'last_downtime' => $lastDowntime,
            'uptime_hours' => round(($totalMinutes - $effectiveOutageMinutes) / 60, 2),
            'range_hours' => $rangeHours,
        ]);
    }

    /**
     * Recursively remove null values from arrays.
     * Allows typst `at(key, default)` to trigger on missing keys.
     */
    private function filterNulls(array $data): array
    {
        $result = [];
        foreach ($data as $key => $value) {
            if ($value === null) {
                continue;
            } elseif (is_array($value)) {
                $filtered = $this->filterNulls($value);
                if (! empty($filtered)) {
                    $result[$key] = $filtered;
                }
            } else {
                $result[$key] = $value;
            }
        }

        return $result;
    }

    /**
     * Sort UUIDs so the same set in any order yields the same cache key.
     */
    private function sortUuids(array $uuids): array
    {
        $uuids = array_values(array_filter(array_map('trim', $uuids)));
        sort($uuids);

        return $uuids;
    }

    /**
     * Delete cached report directories older than one day.
     */
    private function pruneCache(int $maxAgeHours = 24): void
    {
        $root = storage_path('app/typst/cache');
        if (! File::isDirectory($root)) {
            return;
        }

        $cutoff = now()->subHours($maxAgeHours)->timestamp;
        foreach (File::directories($root) as $dir) {
            if (File::lastModified($dir) < $cutoff) {
                File::deleteDirectory($dir);
            }
        }
    }
}
