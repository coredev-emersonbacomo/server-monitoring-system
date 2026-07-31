import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/api/api";

export function useServerAlertTab(
    serverUuid: string,
    serverName: string,
    clientUuid: string | null,
    clientName: string | null,
    initialScope?: string,
) {
    const queryClient = useQueryClient();
    const [alertScope, setAlertScopeState] = useState<
        "global" | "client" | "server"
    >("global");
    const hydratedRef = useRef(false);
    useEffect(() => {
        if (!hydratedRef.current && initialScope) {
            hydratedRef.current = true;
            setAlertScopeState(initialScope as "global" | "client" | "server");
        }
    }, [initialScope]);

    const configKey =
        alertScope === "server"
            ? `server_${serverUuid}`
            : alertScope === "client" && clientUuid
                ? `client_${clientUuid}`
                : "alerts";
    const scopeLabel =
        alertScope === "global"
            ? "Global"
            : alertScope === "client"
                ? `Client: ${clientName ?? "Unknown"}`
                : `Server: ${serverName}`;

    const setAlertScope = useCallback(
        (scope: "global" | "client" | "server") => {
            setAlertScopeState(scope);
            api.PATCH(
                "/v1/clients/{clientUuid}/servers/{serverUuid}/alert-scope",
                {
                    params: { path: { clientUuid: clientUuid!, serverUuid } },
                    body: { alert_scope: scope },
                },
            ).then(() => {
                queryClient.invalidateQueries({
                    queryKey: ["server", serverUuid],
                });
            });
        },
        [serverUuid, clientUuid, queryClient],
    );

    return {
        alertScope,
        setAlertScope,
        configKey,
        scopeLabel,
        clientUuid,
    };
}
