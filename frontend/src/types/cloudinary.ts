export interface UploadSignatureResponse {
    cloud_name: string;
    api_key: string;
    timestamp: number;
    folder: string;
    signature: string;
}

export interface CloudinaryUploadResponse {
    public_id: string;
    secure_url: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
    signature?: string;
}

export interface UploadedImageMetadata {
    public_id: string;
    secure_url: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
}
