import { Mail, AtSign, User, BadgeCheck, ShieldAlert, Loader2 } from "lucide-react";
import { FloatingInput } from "@/components/ui/floatingInput";
import { InfoBlock } from "./InfoBlock";

interface BasicInformationSectionProps {
    mode: "view" | "edit" | "create";
    form: any;
    store: any;
    email: string;
    username: string;
    phone_number: string;
    isVerified?: boolean;
    isResending?: boolean;
    onResend?: () => void;
}

export function BasicInformationSection({
    mode,
    form,
    store,
    email,
    username,
    phone_number,
    isVerified,
    isResending,
    onResend,
}: BasicInformationSectionProps) {
    return (
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
                            onValueChange={store.set("email")}
                        />
                    </div>
                    <div>
                        <FloatingInput
                            label="Username"
                            value={form.username}
                            onValueChange={store.set("username")}
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
                                store.set("phone_number")(digits);
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
                    {mode === "view" && (
                        <div className="sm:col-span-2">
                            {isVerified ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">
                                    <BadgeCheck className="size-3.5" />
                                    Email Verified
                                </span>
                            ) : (
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                        <ShieldAlert className="size-3.5" />
                                        Unverified
                                    </span>
                                    <button
                                        type="button"
                                        onClick={onResend}
                                        disabled={isResending}
                                        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        {isResending ? (
                                            <Loader2 className="size-3.5 animate-spin" />
                                        ) : null}
                                        Resend verification email
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
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
    );
}
