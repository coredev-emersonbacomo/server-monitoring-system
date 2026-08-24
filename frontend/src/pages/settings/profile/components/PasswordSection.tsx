import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { FloatingInput } from "@/components/ui/floatingInput";
import { PasswordStrength } from "./PasswordStrength";
import { type FormStore } from "@/components/ui/form";

interface PasswordSectionProps {
    form: { password: string; password_confirmation: string };
    store: FormStore<any>;
}

export function PasswordSection({ form, store }: PasswordSectionProps) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <section className="space-y-4">
            <div>
                <h3 className="text-sm font-semibold text-foreground">
                    Change Password
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Leave blank to keep the current password.
                </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <div className="relative">
                        <FloatingInput
                            type={showPassword ? "text" : "password"}
                            label="New Password"
                            value={form.password}
                            onValueChange={store.set("password")}
                            className="pr-9"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((p) => !p)}
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
                            <PasswordStrength password={form.password} />
                        </div>
                    )}
                </div>
                <div>
                    <FloatingInput
                        type={showPassword ? "text" : "password"}
                        label="Confirm Password"
                        value={form.password_confirmation}
                        onValueChange={store.set("password_confirmation")}
                    />
                </div>
            </div>
        </section>
    );
}
