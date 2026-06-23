import jwtClient from "@/api/jwtClient";
import type { UploadSignatureResponse } from "@/types/cloudinary";

export async function getProfilePictureUploadSignature(): Promise<UploadSignatureResponse> {
    const { data } = await jwtClient.post<UploadSignatureResponse>("/uploads/profile-picture/signature");
    return data;
}

export async function getClientBannerUploadSignature(): Promise<UploadSignatureResponse> {
    const { data } = await jwtClient.post<UploadSignatureResponse>("/uploads/client-banner/signature");
    return data;
}

export async function updateProfileApi(
    userId: number,
    payload: Record<string, unknown>,
): Promise<unknown> {
    const { data } = await jwtClient.put(`/users/${userId}`, payload);
    return data;
}

export async function updateUserApi(
    userId: number,
    payload: Record<string, unknown>,
): Promise<unknown> {
    const { data } = await jwtClient.put(`/users/${userId}`, payload);
    return data;
}

export async function updateClientApi(
    clientId: number,
    payload: Record<string, unknown>,
): Promise<unknown> {
    const { data } = await jwtClient.put(`/clients/${clientId}`, payload);
    return data;
}
