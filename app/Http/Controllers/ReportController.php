<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
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
     *   data: object (report data, or { items: [...] } for multi templates)
     *   paper: "a4" | "letter" (default: "a4")
     *   orientation: "landscape" | "portrait" (default: "portrait")
     */
    public function compile(Request $request)
    {
        $request->validate([
            'template' => 'required|in:client,server,general,multi-client,multi-server',
            'data' => 'required|array',
            'paper' => 'nullable|in:a4,letter,legal',
            'orientation' => 'nullable|in:landscape,portrait',
        ]);

        $template = $request->input('template');
        $data = $request->input('data');
        $paper = $request->input('paper', 'a4');
        $orientation = $request->input('orientation', 'portrait');

        // Add timestamp and layout settings
        $data['generated_at'] = now()->format('F j, Y H:i');
        $data['orientation'] = $orientation;
        $data['paper'] = $paper;

        // Check cache
        $cacheKey = sha1(json_encode([
            'template' => $template,
            'data' => $data,
            'paper' => $paper,
            'orientation' => $orientation,
        ]));

        $cacheDir = storage_path("app/typst/cache/{$cacheKey}");
        $cachedPdf = "{$cacheDir}/output.pdf";

        if (File::exists($cachedPdf)) {
            return response(file_get_contents($cachedPdf), 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'inline; filename="report.pdf"',
            ]);
        }

        // Create temp working directory
        $workDir = storage_path("app/typst/work/" . Str::uuid());
        File::makeDirectory($workDir, 0755, true);

        try {
            // Write input data JSON
            File::put("{$workDir}/input.json", json_encode($data, JSON_PRETTY_PRINT));

            // Copy template file
            $templateFile = resource_path("typst/{$template}-report.typ");
            if (!File::exists($templateFile)) {
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
            // input.json is read by json("input.json") in the .typ template
            // Typst looks for it relative to the main .typ file
            $outputPdf = "{$workDir}/output.pdf";
            $templateFile = "{$workDir}/{$template}-report.typ";
            $cmd = 'typst compile '
                . escapeshellarg($templateFile) . ' '
                . escapeshellarg($outputPdf)
                . ' 2>&1';

            $output = [];
            $exitCode = 0;
            exec($cmd, $output, $exitCode);

            if ($exitCode !== 0) {
                return response()->json([
                    'error' => 'Typst compilation failed',
                    'details' => implode("\n", $output),
                ], 500);
            }

            if (!File::exists($outputPdf)) {
                return response()->json(['error' => 'PDF was not generated'], 500);
            }

            // Cache the result
            File::makeDirectory($cacheDir, 0755, true);
            File::copy($outputPdf, $cachedPdf);

            // Read PDF bytes into memory before finally cleans up the work dir
            $pdfBytes = file_get_contents($outputPdf);

            return response($pdfBytes, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'inline; filename="report.pdf"',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Report generation failed',
                'details' => $e->getMessage(),
            ], 500);
        } finally {
            // Clean up working directory
            if (File::isDirectory($workDir)) {
                File::deleteDirectory($workDir);
            }
        }
    }
}
