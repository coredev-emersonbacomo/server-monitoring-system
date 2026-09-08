import { useEffect, useRef, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Echo from "laravel-echo";
import Pusher from "pusher-js";
import type { ChannelAuthorizationCallback } from "pusher-js";
// Derive the authorization data shape from the callback type — ChannelAuthorizationData
// is not a named export in all pusher-js versions, so we extract it from the callback.
type ChannelAuthorizationData = NonNullable<
    Parameters<ChannelAuthorizationCallback>[1]
>;
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

export function getEchoInstance(): Echo<"reverb"> {
    return getEcho();
}

// ---------------------------------------------------------------------------
// Singleton Echo — one WS connection for the entire app lifetime.
// Re-creating Echo per component causes repeated auth handshakes (~500 ms ea).
// ---------------------------------------------------------------------------
let echoSingleton: Echo<"reverb"> | null = null;

function getEcho(): Echo<"reverb"> {
    if (echoSingleton) return echoSingleton;

    echoSingleton = new Echo({
        broadcaster: "reverb",
        key: import.meta.env.VITE_REVERB_APP_KEY,
        wsHost: import.meta.env.VITE_REVERB_HOST,
        wsPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
        wssPort: import.meta.env.VITE_REVERB_PORT ?? 8080,
        forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? "https") === "https",
        enabledTransports: ["ws", "wss"],
        // Use a custom authorizer so the JWT token is always read fresh at
        // subscription time — no stale token, no internal config mutation.
        authorizer: (channel: { name: string }) => ({
            authorize: (
                socketId: string,
                callback: (
                    error: Error | null,
                    data: ChannelAuthorizationData | null,
                ) => void,
            ) => {
                fetch("/api/broadcasting/auth", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${getAccessToken()}`,
                    },
                    body: JSON.stringify({
                        socket_id: socketId,
                        channel_name: channel.name,
                    }),
                })
                    .then((res) => res.json())
                    .then((data: ChannelAuthorizationData) =>
                        callback(null, data),
                    )
                    .catch((err) =>
                        callback(
                            err instanceof Error ? err : new Error(String(err)),
                            null,
                        ),
                    );
            },
        }),
    });

    return echoSingleton;
}

export function useServerSocket(
    serverUuid: string,
    onStatus?: (status: WsStatus) => void,
    onAgentUninstalled?: () => void,
    enabled = true,
) {
    const queryClient = useQueryClient();
    const onStatusRef = useRef(onStatus);
    const onAgentUninstalledRef = useRef(onAgentUninstalled);

    useEffect(() => {
        onStatusRef.current = onStatus;
        onAgentUninstalledRef.current = onAgentUninstalled;
    });

    useEffect(() => {
        if (!serverUuid) return;

        const echo = getEcho();
        const channelName = `server.${serverUuid}`;

        const onConnected = () => {
            console.info("[WS] Connected to Reverb");
            onStatusRef.current?.("connected");
        };
        const onDisconnected = () => {
            console.info("[WS] Disconnected from Reverb");
            onStatusRef.current?.("disconnected");
        };

        echo.connector.pusher.connection.bind("connected", onConnected);
        echo.connector.pusher.connection.bind("disconnected", onDisconnected);

        // Fire immediately if already connected
        if (echo.connector.pusher.connection.state === "connected") {
            onStatusRef.current?.("connected");
        }

        const channel = echo.private(channelName);

        const handleServerStatusUpdated = () => {
            queryClient.invalidateQueries({
                queryKey: ["server", serverUuid],
            });
            queryClient.invalidateQueries({ queryKey: ["servers"] });
        };

        const handleRegistrationCompleted = () => {
            // Agent registered — the server just flipped to
            // waiting_for_first_heartbeat. Refetch in place instead of a
            // full page reload so the install→heartbeat transition is smooth.
            queryClient.invalidateQueries({
                queryKey: ["server", serverUuid],
            });
            queryClient.invalidateQueries({ queryKey: ["servers"] });
        };

        // Status/registration pickup listeners only run while the server is in
        // its provisioning lifecycle (unexpired provision token or the brief
        // waiting_for_first_heartbeat window). Settled servers skip these so
        // status events no longer trigger page refetches. The channel itself
        // stays subscribed for live stats (ServerStatsUpdated) either way.
        if (enabled) {
            channel
                .listen(".ServerStatusUpdated", handleServerStatusUpdated)
                .listen(".RegistrationCompleted", handleRegistrationCompleted)
                .listen(".AgentUninstalled", () => {
                    if (onAgentUninstalledRef.current) {
                        onAgentUninstalledRef.current();
                    }
                });
        }

        channel.listen(
            ".ServerStatsUpdated",
            (e: {
                t: number;
                c: number;
                m: number;
                i: number;
                o: number;
                d: number;
                n?: { name: string; type?: string; state?: string; i: number; o: number }[];
            }) => {
                globalMetrics.push(serverUuid, e);
            },
        );

        channel.listen(".FileActivityCreated", () => {
            queryClient.invalidateQueries({ queryKey: ["paginated"] });
        });
        channel.listen(".AgentLifecycleCreated", () => {
            queryClient.invalidateQueries({ queryKey: ["paginated"] });
        });

        return () => {
            echo.connector.pusher.connection.unbind("connected", onConnected);
            echo.connector.pusher.connection.unbind(
                "disconnected",
                onDisconnected,
            );
            channel.stopListening(".ServerStatsUpdated");
            channel.stopListening(".ServerStatusUpdated");
            channel.stopListening(".RegistrationCompleted");
            channel.stopListening(".AgentUninstalled");
            channel.stopListening(".FileActivityCreated");
            channel.stopListening(".AgentLifecycleCreated");
            echo.leaveChannel(channelName);
        };
    }, [queryClient, serverUuid, enabled]);
}

export function useLiveStats(serverUuid: string): StatPoint | null {
    return useSyncExternalStore(
        (cb) => globalMetrics.subscribe(cb),
        () => globalMetrics.getSnapshot().get(serverUuid) ?? null,
    );
}
