import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useDirectUpload } from "@/hooks/useDirectUpload";
import { updateProfileApi } from "@/api/uploads";

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
    const directUpload = useDirectUpload();

    return useMutation({
        mutationFn: async (input: UpdateProfileInput) => {
            let storageKey: string | null = null;
            let intentId: string | null = null;

            if (input.avatarFile) {
                const result = await directUpload.mutateAsync({
                    purpose: "profile_picture",
                    file: input.avatarFile,
                    onUploadProgress: input.onUploadProgress,
                    signal: input.signal,
                });
                storageKey = result.storage_key;
                intentId = result.intent_id;
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

            if (storageKey && intentId) {
                payload.upload_intent_id = intentId;
                payload.profile_picture_storage_key = storageKey;
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
