import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import jwtClient from "@/api/jwtClient";

export function useResendVerification() {
    return useMutation({
        mutationFn: async () => {
            const { data } = await jwtClient.post(
                "/v1/email/verification-resend",
                {},
            );
            return data as { message?: string; masked_email?: string };
        },
        onSuccess: (data) => {
            toast.success("Verification email sent", {
                description:
                    data?.message ??
                    "A new verification link has been sent to your email.",
            });
        },
        onError: () => {
            toast.error("Could not send verification email");
        },
    });
}
