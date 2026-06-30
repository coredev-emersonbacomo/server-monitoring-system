import type { UploadIntentResponse, RequestUploadIntentInput } from "@/types/upload";
import api from "./api";

export async function requestUploadIntent(
    payload: RequestUploadIntentInput,
): Promise<UploadIntentResponse> {
    const { data, error } = await api.POST("/upload-intents", {
        body: payload as never,
    });
    if (error) throw error;
    return data as UploadIntentResponse;
}

export async function getUploadIntent(
    intentId: string,
): Promise<UploadIntentResponse> {
    const { data, error } = await api.GET("/upload-intents/{uploadIntent}", {
        params: { path: { uploadIntent: intentId } },
    });
    if (error) throw error;
    return data as UploadIntentResponse;
}

export async function updateProfileApi(
    userId: number,
    payload: Record<string, unknown>,
): Promise<unknown> {
    const { data, error } = await api.PUT("/users/{user}", {
        params: { path: { user: userId } },
        body: payload as never,
    });
    if (error) throw error;
    return data;
}

export async function updateClientApi(
    clientId: number,
    payload: Record<string, unknown>,
): Promise<unknown> {
    const { data, error } = await api.PUT("/clients/{id}", {
        params: { path: { id: clientId } },
        body: payload as never,
    });
    if (error) throw error;
    return data;
}
