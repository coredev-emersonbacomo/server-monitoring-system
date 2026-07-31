import jwtClient from "@/api/jwtClient";

interface ReportDownloadOptions {
    template: "client" | "server" | "general" | "multi-client" | "multi-server";
    data: object;
    filename: string;
    paper?: string;
    orientation?: "landscape" | "portrait";
}

/**
 * Generate a PDF report via the Typst backend and trigger a download.
 */
export async function generateReportPdf({
    template,
    data,
    filename,
    paper = "a4",
    orientation = "portrait",
}: ReportDownloadOptions): Promise<void> {
    const response = await jwtClient.post(
        "/v1/reports/compile",
        {
            template,
            data,
            paper,
            orientation,
        },
        {
            responseType: "blob",
        },
    );

    const blob = new Blob([response.data], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}
