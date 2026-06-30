import type {
    UploadIntentResponse,
    UploadResult,
} from "@/types/upload";

export async function directUpload(
    file: File,
    intent: UploadIntentResponse,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
): Promise<UploadResult> {
    const config = intent.upload_config as {
        upload_url: string;
        upload_params: Record<string, string | number>;
    };

    const formData = new FormData();
    formData.append("file", file);
    for (const [key, value] of Object.entries(config.upload_params)) {
        formData.append(key, String(value));
    }

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
        xhr.open("POST", config.upload_url);

        if (signal) {
            signal.addEventListener("abort", () => xhr.abort());
        }

        xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable && onProgress) {
                const percent = Math.round((e.loaded / e.total) * 100);
                onProgress(percent);
            }
        });

        xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    resolve({
                        storage_key: intent.storage_key,
                        provider_asset_id: data.public_id ?? data.id ?? data.key ?? "",
                        provider_response: data,
                    });
                } catch {
                    reject(new Error("Failed to parse upload response"));
                }
            } else {
                try {
                    const err = JSON.parse(xhr.responseText);
                    reject(err);
                } catch {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            }
        });

        xhr.addEventListener("error", () => {
            reject(new Error("Network error during upload"));
        });

        xhr.addEventListener("abort", () => {
            reject(new DOMException("Upload aborted", "AbortError"));
        });

        xhr.send(formData);
    });
}
