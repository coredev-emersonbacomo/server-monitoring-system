import { useState, useEffect, useMemo } from "react";
import { z } from "zod";
import { useAuthContext } from "@/hooks/useAuthContext";
import {
    Loader2,
    ShieldCheck,
    Mail,
    User,
    AtSign,
    ChevronLeft,
    Upload,
    Eye,
    EyeOff,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FloatingInput } from "@/components/ui/floatingInput";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useUpdateProfile } from "./hooks/useUpdateProfile";
import { useJwtAuth } from "@/hooks/useJwtAuth";
import PageLayout from "@/components/PageLayout";
import { Form, createFormStore, useForm } from "@/components/ui/form";

const profileSchema = z.object({
    first_name: z.string().min(1, "Required"),
    last_name: z.string().min(1, "Required"),
    email: z.string().min(1, "Required"),
    username: z.string().min(1, "Required"),
    phone_number: z.string(),
    password: z.string(),
    password_confirmation: z.string(),
});

function PasswordStrength({ password }: { password: string }) {
    const checks = [
        { label: "8+ characters", passed: password.length >= 8 },
        { label: "Uppercase letter", passed: /[A-Z]/.test(password) },
        { label: "Number", passed: /[0-9]/.test(password) },
        { label: "Symbol", passed: /[^A-Za-z0-9]/.test(password) },
    ];
    const passedCount = checks.filter((c) => c.passed).length;

    const strengthLabel =
        passedCount <= 1
            ? "Weak"
            : passedCount === 2
              ? "Fair"
              : passedCount === 3
                ? "Good"
                : "Strong";
    const strengthColor =
        passedCount <= 1
            ? "bg-destructive"
            : passedCount === 2
              ? "bg-amber-500"
              : passedCount === 3
                ? "bg-blue-500"
                : "bg-emerald-500";

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
                <div className="flex-1 grid grid-cols-4 gap-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "h-1 rounded-full transition-colors",
                                i < passedCount ? strengthColor : "bg-muted",
                            )}
                        />
                    ))}
                </div>
                <span
                    className={cn(
                        "text-[11px] font-medium shrink-0",
                        passedCount <= 1 && "text-destructive",
                        passedCount === 2 && "text-amber-500",
                        passedCount === 3 && "text-blue-500",
                        passedCount === 4 && "text-emerald-500",
                    )}
                >
                    {strengthLabel}
                </span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
                {checks.map((c) => (
                    <span
                        key={c.label}
                        className={cn(
                            "text-[11px] flex items-center gap-1",
                            c.passed
                                ? "text-emerald-500"
                                : "text-muted-foreground",
                        )}
                    >
                        {c.passed ? "✓" : "○"} {c.label}
                    </span>
                ))}
            </div>
        </div>
    );
}

function InfoBlock({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="bg-muted/50 border border-border/40 rounded-lg px-4 py-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                {icon}
                <span className="text-[10px] uppercase tracking-widest font-medium">
                    {label}
                </span>
            </div>
            <p className="text-sm font-medium text-foreground truncate">
                {value}
            </p>
        </div>
    );
}

export const Profile: React.FC = () => {
    const { user, isLoading } = useAuthContext();
    const navigate = useNavigate();
    const { refreshUser } = useJwtAuth();
    const updateProfile = useUpdateProfile();

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
    const [showPassword, setShowPassword] = useState(false);

    // Populate avatar preview when user data arrives
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

    if (isLoading) {
        return (
            <PageLayout>
                <div className="flex items-center justify-center min-h-[60vh] gap-3">
                    <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                    <p className="text-muted-foreground text-sm">
                        Loading profile...
                    </p>
                </div>
            </PageLayout>
        );
    }

    if (!user) {
        return (
            <PageLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
                    <div className="bg-muted p-3 rounded-full">
                        <ShieldCheck
                            size={28}
                            className="text-muted-foreground"
                        />
                    </div>
                    <p className="text-muted-foreground text-sm">
                        Please log in to view your profile.
                    </p>
                </div>
            </PageLayout>
        );
    }

    const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
    const email = user.email ?? "";
    const username = user.username ?? email.split("@")[0];
    const phone_number = user.phone_number
        ? user.phone_number
              .replace(/\D/g, "")
              .replace(/^(\d{3})(\d{4})(\d{4})$/, "$1-$2-$3")
        : "—";
    const avatarSrc =
        avatarPreview ||
        user.profile_picture_url ||
        import.meta.env.VITE_DEFAULT_PROFILE_PICTURE ||
        null;

    return (
        <PageLayout>
            <Form.Root
                store={store}
                className="w-full flex-1 flex flex-col min-h-0"
            >
                {/* ── Banner / Hero ── */}
                <div className="relative">
                    <div className="absolute inset-0 overflow-hidden rounded-t-xl">
                        <div
                            className="w-full h-full"
                            style={{
                                background:
                                    "linear-gradient(135deg, oklch(0.18 0.04 260 / 0.6), oklch(0.12 0.03 280 / 0.4))",
                            }}
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-background via-background/70 to-transparent" />
                        <div className="absolute inset-0 bg-linear-to-r from-background/40 to-transparent" />
                    </div>

                    <div className="relative z-10 px-6 sm:px-8 lg:px-10 pt-6 pb-20">
                        {/* ── Top bar: actions ── */}
                        <div className="flex items-center justify-between mb-6">
                            <button
                                onClick={() => navigate("/settings")}
                                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Back to Settings
                            </button>
                            <div className="flex items-center gap-2">
                                <Form.Buttons.Cancel />
                                <Form.Buttons.Submit />
                                {mode === "view" && <Form.Buttons.Edit />}
                            </div>
                        </div>

                        {/* ── Avatar + Name ── */}
                        <div className="flex items-end gap-5">
                            <div className="relative shrink-0">
                                <div className="w-20 h-20 rounded-full bg-card border-4 border-background shadow-sm overflow-hidden">
                                    {avatarSrc ? (
                                        <img
                                            src={avatarSrc}
                                            alt="Avatar"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : null}
                                </div>
                                {mode !== "view" && (
                                    <label
                                        htmlFor="avatar-upload"
                                        className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center cursor-pointer shadow-sm hover:opacity-90 transition-opacity"
                                    >
                                        <Upload size={12} />
                                        <input
                                            id="avatar-upload"
                                            type="file"
                                            accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                                            onChange={handleAvatarChange}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </div>

                            <div className="flex-1 min-w-0 pb-1">
                                {mode !== "view" ? (
                                    <div className="flex gap-3">
                                        <div>
                                            <Label className="text-[11px] uppercase tracking-widest text-muted-foreground/70 mb-1">
                                                First name
                                            </Label>
                                            <input
                                                value={form.first_name}
                                                onChange={(e) =>
                                                    store.set("first_name")(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="First name"
                                                className="w-full text-xl sm:text-2xl font-bold tracking-tight bg-transparent border-b-2 border-primary/50 outline-none pb-1 placeholder:text-muted-foreground/40 text-foreground"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[11px] uppercase tracking-widest text-muted-foreground/70 mb-1">
                                                Last name
                                            </Label>
                                            <input
                                                value={form.last_name}
                                                onChange={(e) =>
                                                    store.set("last_name")(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Last name"
                                                className="w-full text-xl sm:text-2xl font-bold tracking-tight bg-transparent border-b-2 border-primary/50 outline-none pb-1 placeholder:text-muted-foreground/40 text-foreground"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">
                                        {fullName}
                                    </h1>
                                )}
                            </div>
                        </div>

                        {/* ── Role / Status badges (view mode only) ── */}
                        {mode === "view" && user && (
                            <div className="flex items-center gap-2 mt-4">
                                <span
                                    className={cn(
                                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
                                        user.record_status === "active"
                                            ? "bg-emerald-500/10 text-emerald-400"
                                            : "bg-red-500/10 text-red-400",
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "w-1.5 h-1.5 rounded-full",
                                            user.record_status === "active"
                                                ? "bg-emerald-400"
                                                : "bg-red-400",
                                        )}
                                    />
                                    {user.record_status === "active"
                                        ? "Active"
                                        : "Inactive"}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Content ── */}
                <div className="flex-1 -mt-12 relative z-20 px-6 sm:px-8 lg:px-10 pb-8">
                    <div className="max-w-3xl mx-auto flex flex-col gap-6">
                        <div className="bg-card border border-border/60 shadow-sm p-6 sm:p-8 flex flex-col gap-8">
                            <Form.SubmitHandler
                                handler={async (
                                    data: Record<string, unknown>,
                                ) => {
                                    const payload: Record<string, unknown> = {
                                        userUuid: user.uuid,
                                        firstName: data.first_name,
                                        lastName: data.last_name,
                                        email: data.email,
                                        username: data.username,
                                        status: user.record_status,
                                    };

                                    if (data.password) {
                                        payload.password = data.password;
                                        payload.passwordConfirmation =
                                            data.password_confirmation;
                                    }

                                    if (avatarFile) {
                                        payload.avatarFile = avatarFile;
                                    }

                                    try {
                                        await updateProfile.mutateAsync(
                                            payload as never,
                                        );
                                        await refreshUser();
                                        store.setMode("view");
                                    } catch (err: unknown) {
                                        const errorData = err as Record<
                                            string,
                                            Record<string, string[]>
                                        >;
                                        if (errorData?.errors) {
                                            const mapped: Record<
                                                string,
                                                string
                                            > = {};
                                            for (const [k, v] of Object.entries(
                                                errorData.errors,
                                            )) {
                                                mapped[k] = Array.isArray(v)
                                                    ? v[0]
                                                    : String(v);
                                            }
                                            store.setState({ errors: mapped });
                                        }
                                    }
                                }}
                            />

                            {/* Basic Information */}
                            <section className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Basic Information
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Your account details.
                                    </p>
                                </div>
                                {mode !== "view" ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <FloatingInput
                                                type="email"
                                                label="Email Address"
                                                value={form.email}
                                                onValueChange={store.set(
                                                    "email",
                                                )}
                                            />
                                        </div>
                                        <div>
                                            <FloatingInput
                                                label="Username"
                                                value={form.username}
                                                onValueChange={store.set(
                                                    "username",
                                                )}
                                            />
                                        </div>
                                        <div>
                                            <FloatingInput
                                                label="Phone Number"
                                                value={form.phone_number}
                                                onValueChange={(value) => {
                                                    const digits = value
                                                        .replace(/\D/g, "")
                                                        .slice(0, 11);
                                                    store.set("phone_number")(
                                                        digits,
                                                    );
                                                }}
                                                maxLength={11}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                                        <InfoBlock
                                            icon={<Mail size={15} />}
                                            label="Email"
                                            value={email}
                                        />
                                        <InfoBlock
                                            icon={<AtSign size={15} />}
                                            label="Username"
                                            value={`@${username}`}
                                        />
                                        <InfoBlock
                                            icon={<User size={15} />}
                                            label="Phone Number"
                                            value={phone_number}
                                        />
                                    </div>
                                )}
                            </section>

                            {/* Password */}
                            {mode !== "view" && (
                                <>
                                    <div className="h-px bg-border" />
                                    <section className="space-y-4">
                                        <div>
                                            <h3 className="text-sm font-semibold text-foreground">
                                                Change Password
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Leave blank to keep the current
                                                password.
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <div className="relative">
                                                    <FloatingInput
                                                        type={
                                                            showPassword
                                                                ? "text"
                                                                : "password"
                                                        }
                                                        label="New Password"
                                                        value={form.password}
                                                        onValueChange={store.set(
                                                            "password",
                                                        )}
                                                        className="pr-9"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setShowPassword(
                                                                (p) => !p,
                                                            )
                                                        }
                                                        className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                                                        tabIndex={-1}
                                                    >
                                                        {showPassword ? (
                                                            <EyeOff className="w-4 h-4" />
                                                        ) : (
                                                            <Eye className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                                {form.password && (
                                                    <div className="mt-2">
                                                        <PasswordStrength
                                                            password={
                                                                form.password
                                                            }
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <FloatingInput
                                                    type={
                                                        showPassword
                                                            ? "text"
                                                            : "password"
                                                    }
                                                    label="Confirm Password"
                                                    value={
                                                        form.password_confirmation
                                                    }
                                                    onValueChange={store.set(
                                                        "password_confirmation",
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </section>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </Form.Root>
        </PageLayout>
    );
};

export default Profile;
