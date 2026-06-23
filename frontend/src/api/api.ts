import createClient from "openapi-fetch";
import type { paths } from "./schema.d";
import { getAccessToken } from "./jwtClient";

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function attemptRefresh(): Promise<string | null> {
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        try {
            const response = await fetch("/api/refresh", {
                method: "POST",
                credentials: "include",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
            });
            if (!response.ok) return null;
            const data = await response.json();
            return data.access_token ?? null;
        } catch {
            return null;
        }
    })();

    try {
        return await refreshPromise;
    } finally {
        refreshPromise = null;
    }
}

const client = createClient<paths>({
    baseUrl: "/api",
    credentials: "include",
    headers: {
        Accept: "application/json",
    },
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = new Request(input, init);
        const headers = new Headers(request.headers);

        const token = getAccessToken();
        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }

        let response = await fetch(new Request(request, { headers }));

        if (response.status === 401 && token && !isRefreshing) {
            isRefreshing = true;
            try {
                const newToken = await attemptRefresh();
                if (newToken) {
                    headers.set("Authorization", `Bearer ${newToken}`);
                    response = await fetch(new Request(request, { headers }));
                } else {
                    window.dispatchEvent(new CustomEvent("auth:logout"));
                }
            } finally {
                isRefreshing = false;
            }
        }

        return response;
    },
});

export default client;
