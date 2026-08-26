import { useCallback, useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import jwtClient from "@/api/jwtClient";
import { useOutletContext } from "react-router-dom";
import type { ReportOrientation, ReportOutletContext } from "@/layouts/ReportsLayout";

type TemplateType = "client" | "server" | "general" | "multi-client" | "multi-server";

interface TypstPreviewProps {
    template: TemplateType;
    /** Explicit data payload — use when you already have the data on the frontend. */
    data?: object;
    /** Single entity UUID — backend fetches data automatically. */
    uuid?: string;
    /** Multiple entity UUIDs — backend fetches each and wraps as { items: [...] }. */
    uuids?: string[];
    paper?: string;
    orientation?: ReportOrientation;
    /** Metrics window in hours for server reports (default: 24). */
    hours?: number;
}

interface CachedPdf {
    url: string;
    generatedAt: string | null;
    filename: string;
}

interface PdfResult {
    blob: Blob;
    generatedAt: string | null;
    filename: string;
}

const pdfCache = new Map<string, CachedPdf>();
const inflight = new Map<string, Promise<PdfResult>>();

function buildCacheKey({
    template,
    data,
    uuid,
    uuids,
    paper,
    orientation,
    hours,
}: TypstPreviewProps): string {
    const ref = uuids?.length
        ? `uuids:${[...uuids].sort().join(",")}`
        : uuid
          ? `uuid:${uuid}`
          : data
            ? `data:${JSON.stringify(data)}`
            : "general";
    return `${template}|${ref}|${paper}|${orientation}|${hours}`;
}

export function TypstPreview({
    template,
    data,
    uuid,
    uuids,
    paper = "a4",
    orientation = "portrait",
    hours = 24,
}: TypstPreviewProps) {
    const { refreshToken } = useOutletContext<ReportOutletContext>();
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [generatedAt, setGeneratedAt] = useState<string | null>(null);
    const [filename, setFilename] = useState<string>("report.pdf");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const prevUrlRef = useRef<string | null>(null);
    const lastTokenRef = useRef(refreshToken);

    const cacheKey = buildCacheKey({ template, data, uuid, uuids, paper, orientation, hours });

    useEffect(() => {
        let cancelled = false;
        const forced = refreshToken !== lastTokenRef.current;
        lastTokenRef.current = refreshToken;

        if (!forced) {
            const hit = pdfCache.get(cacheKey);
            if (hit) {
                setPdfUrl(hit.url);
                setGeneratedAt(hit.generatedAt);
                setFilename(hit.filename);
                setLoading(false);
                setError(null);
                return;
            }
        }

        let pending = inflight.get(cacheKey);
        if (!pending) {
            // Build the payload — backend fetches data when uuid/uuids given
            const payload: Record<string, unknown> = { template, paper, orientation };

            if (uuids && uuids.length > 0) {
                payload.uuids = uuids;
                payload.hours = hours;
            } else if (uuid) {
                payload.uuid = uuid;
                payload.hours = hours;
            } else if (data) {
                payload.data = data;
            } else {
                // general report — no uuid needed, backend fetches all
                payload.data = {};
            }

            if (forced) {
                payload.refresh = true;
            }

            pending = jwtClient
                .post("/v1/reports/compile", payload, { responseType: "blob" })
                .then((response) => ({
                    blob: new Blob([response.data], { type: "application/pdf" }),
                    generatedAt:
                        (response.headers["x-generated-at"] as string | undefined) ?? null,
                    filename:
                        (response.headers["x-filename"] as string | undefined) ?? "report.pdf",
                }));

            inflight.set(cacheKey, pending);
            pending
                .finally(() => {
                    inflight.delete(cacheKey);
                })
                .catch(() => {});
        }

        setLoading(true);
        setError(null);

        pending
            .then(({ blob, generatedAt, filename: fname }) => {
                if (cancelled) return;

                // Revoke the previously displayed blob URL
                if (prevUrlRef.current) {
                    URL.revokeObjectURL(prevUrlRef.current);
                }

                const url = URL.createObjectURL(blob);
                prevUrlRef.current = url;

                pdfCache.set(cacheKey, { url, generatedAt, filename: fname });
                setPdfUrl(url);
                setGeneratedAt(generatedAt);
                setFilename(fname);
                setLoading(false);
            })
            .catch((err: unknown) => {
                if (cancelled) return;

                let message = "Failed to compile report";
                if (err && typeof err === "object" && "response" in err) {
                    const axiosErr = err as { response?: { data?: { error?: string; details?: string } } };
                    if (axiosErr.response?.data?.error) {
                        message = axiosErr.response.data.error;
                        if (axiosErr.response.data.details) {
                            message += `: ${axiosErr.response.data.details}`;
                        }
                    }
                } else if (err instanceof Error) {
                    message = err.message;
                }
                setError(message);
                setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [cacheKey, template, data, uuid, uuids, paper, orientation, hours, refreshToken]);

    const handleDownload = useCallback(() => {
        if (!pdfUrl) return;
        const a = document.createElement("a");
        a.href = pdfUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }, [pdfUrl, filename]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm">Compiling report...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3 text-center">
                    <p className="text-sm text-red-600 font-medium">
                        {error}
                    </p>
                    <p className="text-xs text-muted-foreground max-w-xs">
                        Check that Typst CLI is installed on the server.
                    </p>
                </div>
            </div>
        );
    }

    if (!pdfUrl) {
        return null;
    }

    return (
        <div className="w-full flex flex-col gap-2">
            {generatedAt && (
                <div className="flex items-center justify-between">
                    <button
                        onClick={handleDownload}
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline cursor-pointer"
                    >
                        <Download size={12} />
                        Download PDF
                    </button>
                    <p className="text-xs text-muted-foreground">
                        Generated{" "}
                        {new Date(generatedAt).toLocaleString([], {
                            dateStyle: "medium",
                            timeStyle: "short",
                        })}
                    </p>
                </div>
            )}
            <div className="w-full bg-muted/30 rounded-xl overflow-hidden">
                <object
                    data={pdfUrl}
                    type="application/pdf"
                    className="w-full"
                    style={{ height: "80vh", minHeight: "600px" }}
                >
                    <p className="text-sm text-muted-foreground p-8 text-center">
                        Your browser doesn't support PDF viewing.
                        <a
                            href={pdfUrl}
                            download={filename}
                            className="text-primary underline ml-1"
                        >
                            Download the PDF
                        </a>
                    </p>
                </object>
            </div>
        </div>
    );
}
