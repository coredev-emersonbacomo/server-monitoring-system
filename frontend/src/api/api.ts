import createClient from "openapi-fetch";
import type { paths } from "./schema.d";

function getXsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : "";
}

export const getCsrfCookie = async () => {
    const response = await fetch("/sanctum/csrf-cookie", {
        method: "GET",
        headers: {
            Accept: "application/json",
        },
        credentials: "include",
    });
    if (!response.ok) {
        throw new Error("Failed to get CSRF cookie");
    }
};

const client = createClient<paths>({
    baseUrl: "/api",
    credentials: "include",
    headers: {
        Accept: "application/json",
    },
    fetch: async (input: Request) => {
        const headers = new Headers(input.headers);
        const token = getXsrfToken();
        if (token) {
            headers.set("X-XSRF-TOKEN", token);
        }
        if (!(input.body instanceof FormData)) {
            headers.set("Content-Type", "application/json");
        }
        return fetch(new Request(input, { headers }));
    },
});

export default client;
