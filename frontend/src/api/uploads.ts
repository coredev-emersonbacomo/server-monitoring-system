import type {
    UploadIntentResponse,
    RequestUploadIntentInput,
} from "@/types/upload";
import api from "./api";

export async function requestUploadIntent(
    payload: RequestUploadIntentInput,
): Promise<UploadIntentResponse> {
    const { data, error } = await api.POST("/v1/upload-intents", {
        body: payload as never,
    });
    if (error) throw error;
    return data as UploadIntentResponse;
}

export async function getUploadIntent(
    intentId: string,
): Promise<UploadIntentResponse> {
    const { data, error } = await api.GET("/v1/upload-intents/{uploadIntent}", {
        params: { path: { uploadIntent: intentId } },
    });
    if (error) throw error;
    return data as UploadIntentResponse;
}

export async function updateProfileApi(
    userUuid: string,
    payload: Record<string, unknown>,
): Promise<unknown> {
    const { data, error } = await api.PUT("/v1/users/{user}", {
        params: { path: { user: userUuid } },
        body: payload as never,
    });
    if (error) throw error;
    return data;
}

export async function updateClientApi(
    clientUuid: string,
    payload: Record<string, unknown>,
): Promise<unknown> {
    const { data, error } = await api.PUT("/v1/clients/{uuid}", {
        params: { path: { uuid: clientUuid } },
        body: payload as never,
    });
    if (error) throw error;
    return data;
}
