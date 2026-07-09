let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
    accessToken = token;
}

export function getAccessToken(): string | null {
    return accessToken;
}

async function doRefresh(): Promise<string | null> {
    try {
        const response = await fetch("/api/v1/refresh", {
            method: "POST",
            credentials: "include",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
        });
        if (!response.ok) return null;
        const data = await response.json();
        const token = data.access_token ?? null;
        if (token) {
            accessToken = token;
        }
        return token;
    } catch {
        accessToken = null;
        return null;
    }
}

export function refreshAccessToken(): Promise<string | null> {
    if (refreshPromise) {
        return refreshPromise;
    }
    refreshPromise = doRefresh().finally(() => {
        refreshPromise = null;
    });
    return refreshPromise;
}
