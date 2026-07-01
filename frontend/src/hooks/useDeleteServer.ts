import api from "@/api/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useDeleteServer = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            clientUuid,
            serverUuid,
        }: {
            clientUuid: string;
            serverUuid: string;
        }) => {
            const { error } = await api.DELETE(
                "/clients/{clientUuid}/servers/{serverUuid}",
                {
                    params: { path: { clientUuid, serverUuid } },
                },
            );
            if (error) throw error;
        },
        onSuccess: (_, { clientUuid }) => {
            queryClient.invalidateQueries({
                queryKey: ["clients", clientUuid, "servers"],
            });
        },
    });
};
