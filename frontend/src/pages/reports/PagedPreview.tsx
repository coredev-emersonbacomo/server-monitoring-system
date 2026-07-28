// path: frontend/src/pages/reports/PagedPreview.tsx
import { useEffect, useRef, useState } from "react";
import { Previewer } from "pagedjs";

interface PagedPreviewProps {
    children: React.ReactNode;
}

const REPORT_STYLES = `
    @page {
        size: 297mm 210mm;
        margin: 20mm;
        @bottom-center {
            content: "Page " counter(page) " of " counter(pages);
            font-size: 10px;
            color: #6b7280;
        }
    }

    * {
        box-sizing: border-box;
        font-family: Arial, Helvetica, sans-serif;
    }

    table {
        border-collapse: collapse;
        width: 100%;
    }
    .recharts-wrapper {
        margin: 0 auto !important;
    }

    .recharts-responsive-container {
        margin: 0 auto !important;
    }

    .report-section {
        break-inside: avoid;
    }

    /* Layout */
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .flex-wrap { flex-wrap: wrap; }
    .grid { display: grid; }
    .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    .shrink-0 { flex-shrink: 0; }
    .overflow-y-auto { overflow-y: auto; }

    /* Gaps */
    .gap-1\\.5 { gap: 6px; }
    .gap-2 { gap: 8px; }
    .gap-4 { gap: 14px; }
    .gap-6 { gap: 20px; }
    .gap-x-4 { column-gap: 14px; }
    .gap-y-1\\.5 { row-gap: 6px; }

    /* Spacing */
    .p-3 { padding: 10px; }
    .p-4 { padding: 14px; }
    .pb-6 { padding-bottom: 20px; }
    .mb-2 { margin-bottom: 6px; }
    .mb-3 { margin-bottom: 10px; }
    .mb-6 { margin-bottom: 20px; }
    .mt-4 { margin-top: 14px; }
    .mt-1 { margin-top: 3px; }
    .mt-0\\.5 { margin-top: 2px; }
    .ml-2 { margin-left: 6px; }
    .max-h-24 { max-height: 96px; }

    /* Sizing */
    .w-full { width: 100%; }
    .w-1\\/3 { width: 33.333%; }
    .w-1\\/4 { width: 25%; }
    .w-\\[50\\%\\] { width: 50%; }
    .size-2 { width: 8px; height: 8px; }

    /* Borders */
    .border-b-2 { border-bottom: 2px solid #1f2937; }
    .border-gray-800 { border-color: #1f2937; }
    .rounded-full { border-radius: 9999px; }

    /* Typography */
    .text-xs { font-size: 11px; }
    .text-sm { font-size: 13px; }
    .text-lg { font-size: 16px; }
    .text-xl { font-size: 18px; }
    .text-2xl { font-size: 22px; }
    .font-normal { font-weight: 400; }
    .font-medium { font-weight: 500; }
    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .tracking-tight { letter-spacing: -0.025em; }
    .capitalize { text-transform: capitalize; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }

    /* Colors */
    .text-gray-900 { color: #111827; }
    .text-gray-700 { color: #374151; }
    .text-gray-600 { color: #4b5563; }
    .text-gray-500 { color: #6b7280; }
    .text-gray-400 { color: #9ca3af; }
    .text-muted-foreground { color: #6b7280; }
    .text-green-600 { color: #16a34a; }
    .text-red-600 { color: #dc2626; }
    .text-yellow-600 { color: #ca8a04; }
    .bg-gray-50 { background-color: #f9fafb; }
    .bg-white { background-color: #ffffff; }

    .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
`;

export function PagedPreview({ children }: PagedPreviewProps) {
    const sourceRef = useRef<HTMLDivElement>(null);
    const outputRef = useRef<HTMLDivElement>(null);
    const [rendering, setRendering] = useState(true);

    useEffect(() => {
        if (!sourceRef.current || !outputRef.current) return;

        let debounceTimer: ReturnType<typeof setTimeout>;
        let cancelled = false;
        // Blob URLs currently in use by an in-flight or just-finished
        // preview() call. We only revoke a URL after its preview() call
        // has actually settled, never synchronously on unmount — revoking
        // too early races with Paged.js's internal async fetch of it.
        const activeBlobUrls: string[] = [];

        const paginate = () => {
            if (!sourceRef.current || !outputRef.current) return;
            setRendering(true);
            outputRef.current.innerHTML = "";

            const blobUrl = URL.createObjectURL(
                new Blob([REPORT_STYLES], { type: "text/css" })
            );
            activeBlobUrls.push(blobUrl);

            const previewer = new Previewer();
            previewer
                .preview(sourceRef.current!.innerHTML, [blobUrl], outputRef.current!)
                .then(() => {
                    URL.revokeObjectURL(blobUrl);
                    const idx = activeBlobUrls.indexOf(blobUrl);
                    if (idx !== -1) activeBlobUrls.splice(idx, 1);

                    if (cancelled) return;
                    setRendering(false);

                    const pages = outputRef.current!.querySelectorAll(".pagedjs_page");
                    pages.forEach((page) => {
                        const spacer = document.createElement("div");
                        spacer.className = "paged-page-spacer";
                        page.insertAdjacentElement("afterend", spacer);
                    });
                })
                .catch((err: any) => {
                    URL.revokeObjectURL(blobUrl);
                    const idx = activeBlobUrls.indexOf(blobUrl);
                    if (idx !== -1) activeBlobUrls.splice(idx, 1);

                    if (cancelled) return;
                    console.error("Paged.js pagination failed:", err);
                    setRendering(false);
                });
        };

        paginate();

        const observer = new MutationObserver(() => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(paginate, 500);
        });
        
        observer.observe(sourceRef.current, {
            childList: true,
            subtree: true,
            characterData: true,
        });

        return () => {
            cancelled = true;
            clearTimeout(debounceTimer);
            observer.disconnect();
            // Intentionally do NOT revoke activeBlobUrls here — any
            // in-flight preview() call still needs to fetch them. They
            // get revoked in their own .then()/.catch() once settled.
        };
    }, [children]);

    return (
        <div>
            <div
                ref={sourceRef}
                style={{
                    position: "absolute",
                    top: 0,
                    left: "-9999px",
                    width: "297mm",
                    visibility: "hidden",
                }}
            >
                {children}
            </div>

            {rendering && (
                <p className="text-sm text-muted-foreground text-center py-8">
                    Preparing document...
                </p>
            )}

            <div ref={outputRef} className="paged-output" />
        </div>
    );
}