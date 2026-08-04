import { createContext, useContext } from "react";
import type { FormStore } from "@/components/ui/form";
import type { ServerData } from "@/types/models";
import type { useDeleteServer } from "../hooks/useDeleteServer";
import type { useServerAlertTab } from "../hooks/useServerAlertTab";
import type { useNavigate } from "react-router-dom";
import type { z } from "zod";
import type { serverInfoSchema } from "../types";

export type CopyKey =
    | "linux"
    | "windows"
    | "uninstall_linux"
    | "uninstall_windows";

export type ServerInfoForm = z.infer<typeof serverInfoSchema>;
export type ServerDetailServer = ServerData & {
    uptime_seconds?: number;
    running_balance?: number;
    net_cost?: number;
};

export type ServerDetailContextValue = {
    store: FormStore<ServerInfoForm>;
    initial: ServerData;
    server: ServerDetailServer;
    mode: string;
    form: ServerInfoForm;
    confirmText: string;
    setConfirmText: (value: string) => void;
    deleteServer: ReturnType<typeof useDeleteServer>;
    isConfirmed: boolean;
    allClient: boolean;
    navigate: ReturnType<typeof useNavigate>;
    setShowCostModal: (open: boolean) => void;
    copyToClipboard: (text: string, type: CopyKey) => void;
    serverAlertTab: ReturnType<typeof useServerAlertTab>;
    handleDeletePort: (id: number) => void;
    showCostModal: boolean;
    costLogs: any[];
    isLoadingCostLogs: boolean;
    deductAmount: string;
    setDeductAmount: (value: string) => void;
    submittingPayment: boolean;
    handleCostAdjustment: (
        type: "deduction" | "add_funds" | "add_credit" | "reset_usage",
        amount?: number,
    ) => void;
};

export const ServerDetailContext = createContext<ServerDetailContextValue | null>(null);

export function useServerDetailContext() {
    const context = useContext(ServerDetailContext);
    if (!context) {
        throw new Error("Server detail context is missing.");
    }
    return context;
}
