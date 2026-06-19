import { useQuery } from "@tanstack/react-query";
import type { StatPoint } from "@/types/stats";

export interface ServerDetailData {
    id: number;
    server_name: string;
    device_name: string;
    internal_ip: string;
    external_ip: string;
    cpu_cores: number | null;
    ram: number | null;
    operating_system: string | null;
    client_id: number;
    client_name: string;
    stats: StatPoint[];
}

export const useServer = (id: number) => {
    return useQuery({
        queryKey: ["server", id],
        queryFn: async (): Promise<ServerDetailData> => {
            const res = await fetch(`/api/servers/${id}`, {
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to load server");
            return res.json();
        },
        enabled: !!id,
    });
};
