import { getCsrfCookie } from "@/api/api";
import type { UploadSignatureResponse } from "@/types/cloudinary";

const API_BASE = "/api";

export async function getProfilePictureUploadSignature(): Promise<UploadSignatureResponse> {
    await getCsrfCookie();
    const res = await fetch(`${API_BASE}/uploads/profile-picture/signature`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        credentials: "include",
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw data;
    }
    return res.json();
}

export async function getClientBannerUploadSignature(): Promise<UploadSignatureResponse> {
    await getCsrfCookie();
    const res = await fetch(`${API_BASE}/uploads/client-banner/signature`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        credentials: "include",
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw data;
    }
    return res.json();
}

export async function updateProfileApi(
    userId: number,
    payload: Record<string, unknown>,
): Promise<unknown> {
    await getCsrfCookie();
    const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: "PUT",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw data;
    }
    return res.json();
}

export async function updateUserApi(
    userId: number,
    payload: Record<string, unknown>,
): Promise<unknown> {
    await getCsrfCookie();
    const res = await fetch(`${API_BASE}/users/${userId}`, {
        method: "PUT",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw data;
    }
    return res.json();
}

export async function updateClientApi(
    clientId: number,
    payload: Record<string, unknown>,
): Promise<unknown> {
    await getCsrfCookie();
    const res = await fetch(`${API_BASE}/clients/${clientId}`, {
        method: "PUT",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw data;
    }
    return res.json();
}
