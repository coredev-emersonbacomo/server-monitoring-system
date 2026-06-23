import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
    accessToken = token;
}

export function getAccessToken(): string | null {
    return accessToken;
}

const jwtClient = axios.create({
    baseURL: "/api",
    withCredentials: true,
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
    },
});

jwtClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (accessToken && config.headers) {
        config.headers.Authorization = `Bearer ${accessToken}`;
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

async function refreshAccessToken(): Promise<string | null> {
    try {
        const response = await axios.post(
            "/api/refresh",
            {},
            {
                withCredentials: true,
                headers: { Accept: "application/json" },
            },
        );

        const { access_token } = response.data;
        if (access_token) {
            accessToken = access_token;
            return access_token;
        }
        return null;
    } catch {
        accessToken = null;
        return null;
    }
}

jwtClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
            _retry?: boolean;
        };

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (originalRequest.url === '/refresh') {
                accessToken = null;
                return Promise.reject(error);
            }
            if (refreshPromise) {
                try {
                    const token = await refreshPromise;
                    if (token && originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                    }
                    return jwtClient(originalRequest);
                } catch {
                    return Promise.reject(error);
                }
            }

            originalRequest._retry = true;

            refreshPromise = refreshAccessToken();

            try {
                const newToken = await refreshPromise;
                processQueue(null, newToken);

                if (newToken && originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${newToken}`;
                }
                return jwtClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                accessToken = null;
                window.dispatchEvent(new CustomEvent("auth:logout"));
                return Promise.reject(refreshError);
            } finally {
                refreshPromise = null;
            }
        }

        return Promise.reject(error);
    },
);

export default jwtClient;
