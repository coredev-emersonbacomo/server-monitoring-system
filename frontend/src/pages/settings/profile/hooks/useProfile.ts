import { useState, useEffect, useMemo } from "react";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useJwtAuth } from "@/hooks/useJwtAuth";
import { createFormStore, useForm } from "@/components/ui/form";
import { profileSchema } from "../constants/profileSchema";
import { useUpdateProfile } from "./useUpdateProfile";
import { useResendVerification } from "./useResendVerification";

export function useProfile() {
    const { user, isLoading } = useAuthContext();
    const navigate = useNavigate();
    const { refreshUser } = useJwtAuth();
    const updateProfile = useUpdateProfile();
    const resendVerification = useResendVerification();

    const store = useMemo(
        () =>
            createFormStore({
                schema: profileSchema,
                originalData: user
                    ? {
                          first_name: user.first_name,
                          last_name: user.last_name,
                          email: user.email,
                          username: user.username,
                          phone_number: user.phone_number || "",
                          timezone: user.timezone || "",
                          password: "",
                          password_confirmation: "",
                      }
                    : null,
                initialMode: "view",
            }),
        [user],
    );

    const mode = useForm(store, (s) => s.mode);
    const form = useForm(store, (s) => s.form as z.infer<typeof profileSchema>);

    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            setAvatarPreview(user.profile_picture_url ?? null);
        }
    }, [user]);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setAvatarFile(file);
        if (file) {
            const reader = new FileReader();
            reader.onload = () => setAvatarPreview(reader.result as string);
            reader.readAsDataURL(file);
        } else {
            setAvatarPreview(user?.profile_picture_url ?? null);
        }
    };

    const handleFormSubmit = async (data: Record<string, unknown>) => {
        if (!user) return;

        const payload: Record<string, unknown> = {
            userUuid: user.uuid,
            firstName: data.first_name,
            lastName: data.last_name,
            email: data.email,
            username: data.username,
            phoneNumber: data.phone_number,
            status: user.record_status,
            timezone: data.timezone,
        };

        if (data.password) {
            payload.password = data.password;
            payload.passwordConfirmation = data.password_confirmation;
        }

        if (avatarFile) {
            payload.avatarFile = avatarFile;
        }

        try {
            await updateProfile.mutateAsync(payload as never);
            await refreshUser();
            store.setMode("view");
        } catch (err: unknown) {
            const errorData = err as Record<string, Record<string, string[]>>;
            if (errorData?.errors) {
                const mapped: Record<string, string> = {};
                for (const [k, v] of Object.entries(errorData.errors)) {
                    mapped[k] = Array.isArray(v) ? v[0] : String(v);
                }
                store.setState({ errors: mapped });
            }
        }
    };

    const fullName = user ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() : "";
    const email = user?.email ?? "";
    const username = user?.username ?? (email ? email.split("@")[0] : "");
    const isVerified = !!user?.email_verified_at;
    const phone_number = user?.phone_number
        ? user.phone_number
              .replace(/\D/g, "")
              .replace(/^(\d{3})(\d{4})(\d{4})$/, "$1-$2-$3")
        : "—";
    const avatarSrc =
        avatarPreview ||
        user?.profile_picture_url ||
        import.meta.env.VITE_DEFAULT_PROFILE_PICTURE ||
        null;

    return {
        user,
        isLoading,
        navigate,
        store,
        mode,
        form,
        fullName,
        email,
        username,
        phone_number,
        isVerified,
        avatarSrc,
        handleAvatarChange,
        handleFormSubmit,
        resendVerification,
    };
}
