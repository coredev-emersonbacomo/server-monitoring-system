import type {
    UploadSignatureResponse,
    CloudinaryUploadResponse,
} from "@/types/cloudinary";

export async function uploadToCloudinary(
    file: File,
    signature: UploadSignatureResponse,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
): Promise<CloudinaryUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", signature.api_key);
    formData.append("timestamp", String(signature.timestamp));
    formData.append("folder", signature.folder);
    formData.append("signature", signature.signature);

    const url = `https://api.cloudinary.com/v1_1/${signature.cloud_name}/auto/upload`;

    const xhr = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
        xhr.open("POST", url);

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
                    const data: CloudinaryUploadResponse = JSON.parse(xhr.responseText);
                    resolve(data);
                } catch {
                    reject(new Error("Failed to parse Cloudinary response"));
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
            reject(new Error("Network error during Cloudinary upload"));
        });

        xhr.addEventListener("abort", () => {
            reject(new DOMException("Upload aborted", "AbortError"));
        });

        xhr.send(formData);
    });
}
