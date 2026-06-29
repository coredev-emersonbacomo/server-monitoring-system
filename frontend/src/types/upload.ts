export interface UploadIntentResponse {
    intent_id: string;
    storage_key: string;
    provider: string;
    upload_config: Record<string, unknown>;
    purpose_config: {
        max_file_size: number;
        allowed_mime_types: string[];
    };
    expires_at: string;
}

export interface UploadResult {
    storage_key: string;
    provider_asset_id: string;
    provider_response: Record<string, unknown>;
}

export interface DirectUploadOptions {
    file: File;
    onProgress?: (percent: number) => void;
    signal?: AbortSignal;
}

export interface RequestUploadIntentInput {
    purpose: "profile_picture" | "client_banner" | "attachment" | "document";
}
