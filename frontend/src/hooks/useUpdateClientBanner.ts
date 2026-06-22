import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getClientBannerUploadSignature, updateClientApi } from "@/api/cloudinary";
import { uploadToCloudinary } from "@/services/cloudinary";
import type { UploadedImageMetadata } from "@/types/cloudinary";

interface UpdateClientInput {
    clientId: number;
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

    return useMutation({
        mutationFn: async (input: UpdateClientInput) => {
            let cloudinaryMetadata: UploadedImageMetadata | null = null;

            if (input.bannerFile) {
                const signature = await getClientBannerUploadSignature();
                const result = await uploadToCloudinary(
                    input.bannerFile,
                    signature,
                    input.onUploadProgress,
                    input.signal,
                );
                cloudinaryMetadata = {
                    public_id: result.public_id,
                    secure_url: result.secure_url,
                    width: result.width,
                    height: result.height,
                    format: result.format,
                    bytes: result.bytes,
                };
            }

            const payload: Record<string, unknown> = {
                name: input.name,
                description: input.description,
                location: input.location,
                email: input.email,
                contact_number: input.contactNumber,
            };

            if (cloudinaryMetadata) {
                payload.cloudinary_url = cloudinaryMetadata.secure_url;
                payload.cloudinary_public_id = cloudinaryMetadata.public_id;
            }

            return updateClientApi(input.clientId, payload);
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            queryClient.invalidateQueries({ queryKey: ["clients", variables.clientId] });
            toast.success("Client updated successfully.");
        },
        onError: () => {
            toast.error("Failed to update client.");
        },
    });
}
