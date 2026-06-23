import { useQuery } from "@tanstack/react-query";
import jwtClient from "@/api/jwtClient";

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
            const { data } = await jwtClient.get<ServerListItem[]>("/servers");
            return data;
        },
    });
};
