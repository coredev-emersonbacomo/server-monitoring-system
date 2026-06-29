import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import jwtClient from "@/api/jwtClient";
import type { components } from "@/api/schema.d";

type ClientData = components["schemas"]["ClientData"];

export const useClients = () => {
    return useQuery({
        queryKey: ["clients"],
        queryFn: async (): Promise<ClientData[]> => {
            try {
                const response = await jwtClient.get<ClientData[]>("/clients");
                return response.data || [];
            } catch (error) {
                console.error("Failed to fetch clients:", error);
                throw error;
            }
        },
    });
};

export const useClient = (id: number) => {
    return useQuery({
        queryKey: ["clients", id],
        queryFn: async (): Promise<ClientData> => {
            try {
                const response = await jwtClient.get<ClientData>(`/clients/${id}`);
                return response.data;
            } catch (error) {
                console.error("Failed to fetch client:", error);
                throw error;
            }
        },
        enabled: !!id,
    });
};

export const useCreateClient = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (formData: FormData) => {
            try {
                const response = await jwtClient.post("/clients", formData);
                return response.data;
            } catch (error) {
                console.error("Failed to create client:", error);
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
        },
    });
};

export const useUpdateClient = (id: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (formData: FormData) => {
            try {
                const response = await jwtClient.post(`/clients/${id}`, formData);
                return response.data;
            } catch (error) {
                console.error("Failed to update client:", error);
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            queryClient.invalidateQueries({ queryKey: ["clients", id] });
        },
    });
};

export interface ClientServer {
    id: number;
    client_id: number;
    server_name: string;
    device_name: string;
    internal_ip: string;
    external_ip: string;
    cpu_cores: number | null;
    ram: number | null;
    operating_system: string | null;
    created_at: string;
    updated_at: string;
}

export const useClientServers = (clientId: number) => {
    return useQuery({
        queryKey: ["clients", clientId, "servers"],
        queryFn: async (): Promise<ClientServer[]> => {
            try {
                const response = await jwtClient.get<ClientServer[]>(`/clients/${clientId}/servers`);
                return response.data || [];
            } catch (error) {
                console.error("Failed to fetch servers:", error);
                throw error;
            }
        },
        enabled: !!clientId,
    });
};

export const useDeleteClient = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            try {
                await jwtClient.delete(`/clients/${id}`);
            } catch (error) {
                console.error("Failed to delete client:", error);
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
        },
    });
};

export const useClientSecops = (clientId: number) => {
    return useQuery({
        queryKey: ["clients", clientId, "secops"],
        queryFn: async (): Promise<any[]> => {
            try {
                const response = await jwtClient.get(`/clients/${clientId}/secops`);
                return response.data || [];
            } catch (error) {
                console.error("Failed to fetch secops:", error);
                throw error;
            }
        },
        enabled: !!clientId,
    });
};

export const useAddClientSecop = (clientId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (userId: number) => {
            try {
                const response = await jwtClient.post(`/clients/${clientId}/secops`, { user_id: userId });
                return response.data;
            } catch (error) {
                console.error("Failed to add secop:", error);
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients", clientId, "secops"] });
            queryClient.invalidateQueries({ queryKey: ["clients", clientId] });
        },
    });
};

export const useRemoveClientSecop = (clientId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (userId: number) => {
            try {
                await jwtClient.delete(`/clients/${clientId}/secops/${userId}`);
            } catch (error) {
                console.error("Failed to remove secop:", error);
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients", clientId, "secops"] });
            queryClient.invalidateQueries({ queryKey: ["clients", clientId] });
        },
    });
};
