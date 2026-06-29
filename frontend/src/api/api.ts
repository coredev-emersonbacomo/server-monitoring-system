import createClient from "openapi-fetch";
import type { paths } from "./schema.d";
import { getAccessToken, refreshAccessToken } from "./tokenManager";

const api = createClient<paths>({
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

        if (response.status === 401 && token) {
            try {
                const newToken = await refreshAccessToken();
                if (newToken) {
                    headers.set("Authorization", `Bearer ${newToken}`);
                    response = await fetch(new Request(request, { headers }));
                } else {
                    window.dispatchEvent(new CustomEvent("auth:logout"));
                }
            } catch {
                window.dispatchEvent(new CustomEvent("auth:logout"));
            }
        }

        return response;
    },
});

export default api;
