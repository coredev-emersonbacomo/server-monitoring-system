import { useEffect, useRef, useState } from "react";
import jwtClient from "@/api/jwtClient";
import type { ReportOrientation } from "@/layouts/ReportsLayout";

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

export function TypstPreview({
    template,
    data,
    uuid,
    uuids,
    paper = "a4",
    orientation = "portrait",
    hours = 24,
}: TypstPreviewProps) {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const prevUrlRef = useRef<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function compile() {
            setLoading(true);
            setError(null);

            try {
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

                const response = await jwtClient.post(
                    "/v1/reports/compile",
                    payload,
                    { responseType: "blob" },
                );

                if (cancelled) return;

                // Revoke previous blob URL
                if (prevUrlRef.current) {
                    URL.revokeObjectURL(prevUrlRef.current);
                }

                const blob = new Blob([response.data], {
                    type: "application/pdf",
                });
                const url = URL.createObjectURL(blob);
                prevUrlRef.current = url;
                setPdfUrl(url);
                setLoading(false);
            } catch (err: unknown) {
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
            }
        }

        compile();

        return () => {
            cancelled = true;
        };
    }, [template, data, uuid, uuids, paper, orientation, hours]);

    // Revoke on unmount
    useEffect(() => {
        return () => {
            if (prevUrlRef.current) {
                URL.revokeObjectURL(prevUrlRef.current);
            }
        };
    }, []);

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
                        download
                        className="text-primary underline ml-1"
                    >
                        Download the PDF
                    </a>
                </p>
            </object>
        </div>
    );
}
