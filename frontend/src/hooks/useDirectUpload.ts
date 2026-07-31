import { useMutation } from "@tanstack/react-query";
import { requestUploadIntent } from "@/api/uploads";
import { directUpload } from "@/services/directUpload";
import type { RequestUploadIntentInput } from "@/types/upload";

interface UseDirectUploadInput {
    purpose: RequestUploadIntentInput["purpose"];
    file: File;
    onUploadProgress?: (percent: number) => void;
    signal?: AbortSignal;
}

export function useDirectUpload() {
    return useMutation({
        mutationFn: async (input: UseDirectUploadInput) => {
            const intent = await requestUploadIntent({
                purpose: input.purpose,
            });

            const result = await directUpload(
                input.file,
                intent,
                input.onUploadProgress,
                input.signal,
            );

            return {
                intent_id: intent.intent_id,
                storage_key: result.storage_key,
                provider_asset_id: result.provider_asset_id,
                intent,
                result,
            };
        },
    });
}
