import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { getAccessToken, refreshAccessToken } from "./tokenManager";

const jwtClient = axios.create({
    baseURL: "/api",
    withCredentials: true,
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
    },
});

jwtClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

let failedQueue: Array<{
    resolve: (token: string | null) => void;
    reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) {
            reject(error);
        } else {
            resolve(token);
        }
    });
    failedQueue = [];
}

jwtClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
            _retry?: boolean;
        };

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (originalRequest.url === '/refresh') {
                return Promise.reject(error);
            }

            originalRequest._retry = true;

            try {
                const newToken = await refreshAccessToken();
                if (newToken) {
                    processQueue(null, newToken);
                    if (originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                    }
                    return jwtClient(originalRequest);
                }
                processQueue(null, null);
                window.dispatchEvent(new CustomEvent("auth:logout"));
                return Promise.reject(error);
            } catch (refreshError) {
                processQueue(refreshError, null);
                window.dispatchEvent(new CustomEvent("auth:logout"));
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    },
);

export default jwtClient;
