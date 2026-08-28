import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/api/api";

export function useClientAlertTab(
    clientUuid: string,
    clientName: string,
    initialScope?: string,
) {
    const queryClient = useQueryClient();
    const [alertScope, setAlertScopeState] = useState<"global" | "client">(
        "global",
    );
    const hydratedRef = useRef(false);

    useEffect(() => {
        if (!hydratedRef.current && initialScope) {
            hydratedRef.current = true;
            setAlertScopeState(initialScope as "global" | "client");
        }
    }, [initialScope]);

    const configKey =
        alertScope === "global" ? "alerts" : `client_${clientUuid}`;
    const scopeLabel =
        alertScope === "global" ? "Global" : `Client: ${clientName}`;

    const setAlertScope = useCallback(
        (scope: "global" | "client") => {
            setAlertScopeState(scope);
            api.PATCH("/v1/clients/{clientUuid}/alert-scope", {
                params: { path: { clientUuid } },
                body: { alert_scope: scope },
            }).then(() => {
                queryClient.invalidateQueries({
                    queryKey: ["clients", clientUuid],
                });
            });
        },
        [clientUuid, queryClient],
    );

    return { alertScope, setAlertScope, configKey, scopeLabel };
}
