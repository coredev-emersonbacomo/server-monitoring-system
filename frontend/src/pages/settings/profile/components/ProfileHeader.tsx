import { ChevronLeft, Upload, BadgeCheck, ShieldAlert } from "lucide-react";
import { Form, type FormStore } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import type { AuthUserData } from "@/types/models";

interface ProfileHeaderProps {
    mode: "view" | "edit" | "create";
    user: AuthUserData;
    form: Record<string, string>;
    store: FormStore<any>;
    fullName: string;
    isVerified?: boolean;
    avatarSrc: string | null;
    onNavigateBack: () => void;
    onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ProfileHeader({
    mode,
    user,
    form,
    store,
    fullName,
    isVerified,
    avatarSrc,
    onNavigateBack,
    onAvatarChange,
}: ProfileHeaderProps) {
    return (
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
                        type="button"
                        onClick={onNavigateBack}
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back to Settings
                    </button>
                    <div className="flex items-center gap-2">
                        {mode === "view" ? (
                            <Form.Buttons.Edit />
                        ) : (
                            <>
                                <Form.Buttons.Cancel />
                                <Form.Buttons.Submit />
                            </>
                        )}
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
                                    onChange={onAvatarChange}
                                    className="hidden"
                                />
                            </label>
                        )}
                    </div>

                    <div className="flex-1 min-w-0 pb-1">
                        {mode !== "view" ? (
                            <div className="flex gap-3">
                                <div>
                                    <label className="text-[11px] uppercase tracking-widest text-muted-foreground/70 mb-1 block">
                                        First name
                                    </label>
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
                                    <label className="text-[11px] uppercase tracking-widest text-muted-foreground/70 mb-1 block">
                                        Last name
                                    </label>
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
                        <span
                            className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
                                isVerified
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-muted text-muted-foreground",
                            )}
                        >
                            {isVerified ? (
                                <BadgeCheck className="size-3.5" />
                            ) : (
                                <ShieldAlert className="size-3.5" />
                            )}
                            {isVerified
                                ? "Email Verified"
                                : "Email Unverified"}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
