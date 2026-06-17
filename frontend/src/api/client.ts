import createClient from "openapi-fetch";
import type { paths } from "./schema.d";

const client = createClient<paths>({
    baseUrl: "/api",
    credentials: "include",
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});

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

export default client;
