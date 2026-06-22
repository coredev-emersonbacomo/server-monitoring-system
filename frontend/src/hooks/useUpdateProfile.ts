import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getProfilePictureUploadSignature, updateProfileApi } from "@/api/cloudinary";
import { uploadToCloudinary } from "@/services/cloudinary";
import type { UploadedImageMetadata } from "@/types/cloudinary";

interface UpdateProfileInput {
    userId: number;
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    roleId: number;
    status: string;
    password?: string;
    passwordConfirmation?: string;
    avatarFile?: File | null;
    onUploadProgress?: (percent: number) => void;
    signal?: AbortSignal;
}

export function useUpdateProfile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: UpdateProfileInput) => {
            let cloudinaryMetadata: UploadedImageMetadata | null = null;

            if (input.avatarFile) {
                const signature = await getProfilePictureUploadSignature();
                const result = await uploadToCloudinary(
                    input.avatarFile,
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
                first_name: input.firstName,
                last_name: input.lastName,
                email: input.email,
                username: input.username,
                role_id: input.roleId,
                status: input.status,
            };

            if (input.password) {
                payload.password = input.password;
                payload.password_confirmation = input.passwordConfirmation;
            }

            if (cloudinaryMetadata) {
                payload.cloudinary_url = cloudinaryMetadata.secure_url;
                payload.cloudinary_public_id = cloudinaryMetadata.public_id;
            }

            return updateProfileApi(input.userId, payload);
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            queryClient.invalidateQueries({ queryKey: ["users", variables.userId] });
            toast.success("Profile updated successfully.");
        },
        onError: () => {
            toast.error("Failed to update profile.");
        },
    });
}
