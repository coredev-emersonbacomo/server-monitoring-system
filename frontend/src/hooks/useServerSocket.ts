import { useEffect, useRef, useSyncExternalStore } from "react";
import Echo from "laravel-echo";
import Pusher from "pusher-js";
import { getAccessToken } from "@/api/tokenManager";
import { globalMetrics } from "@/lib/metricsBuffer";
import type { StatPoint } from "@/types/stats";

declare global {
    interface Window {
        Pusher: typeof Pusher;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Echo: Echo<any>;
    }
}

window.Pusher = Pusher;

export type WsStatus = "connecting" | "connected" | "disconnected";

export function useServerSocket(
    serverUuid: string,
    onStatus: (status: WsStatus) => void,
) {
    const onStatusRef = useRef(onStatus);

    useEffect(() => {
        if (!serverUuid) return;

        const echo = new Echo({
            broadcaster: "reverb",
            key: import.meta.env.VITE_REVERB_APP_KEY,
            wsHost: import.meta.env.VITE_REVERB_HOST,
            wsPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
            wssPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
            forceTLS:
                (import.meta.env.VITE_REVERB_SCHEME ?? "https") === "https",
            enabledTransports: ["ws", "wss"],
            authEndpoint: "/api/broadcasting/auth",
            auth: {
                headers: {
                    Authorization: `Bearer ${getAccessToken()}`,
                },
            },
        });

        echo.connector.pusher.connection.bind("connected", () => {
            console.info("[WS] Connected to Reverb");
            onStatusRef.current("connected");
        });

        echo.connector.pusher.connection.bind("disconnected", () => {
            console.info("[WS] Disconnected from Reverb");
            onStatusRef.current("disconnected");
        });

        const channel = `server.${serverUuid}`;

        echo.private(channel).listen(
            ".ServerStatsUpdated",
            (e: {
                t: number;
                c: number;
                m: number;
                i: number;
                o: number;
                d: number;
            }) => {
                console.log(e);
                globalMetrics.push(serverUuid, e);
            },
        );

        return () => {
            echo.leaveChannel(channel);
            echo.disconnect();
        };
    }, [serverUuid]);
}

export function useLiveStats(serverUuid: string): StatPoint | null {
    return useSyncExternalStore(
        (cb) => globalMetrics.subscribe(cb),
        () => globalMetrics.getSnapshot().get(serverUuid) ?? null,
    );
}
