import { useQuery } from "@tanstack/react-query";

export interface ServerListItem {
    id: number;
    server_name: string;
    device_name: string;
    internal_ip: string;
    external_ip: string;
    client_id: number;
    client_name: string;
    status: "online" | "warning" | "offline";
    cpu_cores: number | null;
    ram: number | null;
    operating_system: string | null;
    last_seen: string | null;
}

export const useServers = () => {
    return useQuery<ServerListItem[]>({
        queryKey: ["servers"],
        queryFn: async () => {
            const res = await fetch("/api/servers", {
                headers: { Accept: "application/json" },
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to load servers");
            return res.json();
        },
    });
};
