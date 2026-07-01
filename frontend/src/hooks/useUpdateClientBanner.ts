import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useDirectUpload } from "@/hooks/useDirectUpload";
import { updateClientApi } from "@/api/uploads";

interface UpdateClientInput {
    clientUuid: string;
    name: string;
    description: string;
    location: string;
    email: string;
    contactNumber: string;
    bannerFile?: File | null;
    onUploadProgress?: (percent: number) => void;
    signal?: AbortSignal;
}

export function useUpdateClient() {
    const queryClient = useQueryClient();
    const directUpload = useDirectUpload();

    return useMutation({
        mutationFn: async (input: UpdateClientInput) => {
            let storageKey: string | null = null;
            let intentId: string | null = null;

            if (input.bannerFile) {
                const result = await directUpload.mutateAsync({
                    purpose: "client_banner",
                    file: input.bannerFile,
                    onUploadProgress: input.onUploadProgress,
                    signal: input.signal,
                });
                storageKey = result.storage_key;
                intentId = result.intent_id;
            }

            const payload: Record<string, unknown> = {
                name: input.name,
                description: input.description,
                location: input.location,
                email: input.email,
                contact_number: input.contactNumber,
            };

            if (storageKey && intentId) {
                payload.upload_intent_id = intentId;
                payload.banner_image_storage_key = storageKey;
            }

            return updateClientApi(input.clientUuid, payload);
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            queryClient.invalidateQueries({ queryKey: ["clients", variables.clientUuid] });
            toast.success("Client updated successfully.");
        },
        onError: () => {
            toast.error("Failed to update client.");
        },
    });
}
