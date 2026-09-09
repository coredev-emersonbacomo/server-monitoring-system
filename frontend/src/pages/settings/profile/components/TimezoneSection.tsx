import { Clock } from "lucide-react";
import { TimezoneCombobox } from "@/components/TimezoneCombobox";
import { tzOffsetLabel } from "@/components/timezoneOptions";
import { InfoBlock } from "./InfoBlock";
import { type FormStore } from "@/components/ui/form";
import type { ProfileForm } from "../constants/profileSchema";

interface TimezoneSectionProps {
    mode: "view" | "edit" | "create";
    form: ProfileForm;
    store: FormStore<ProfileForm>;
    timezone?: string | null;
}

export function TimezoneSection({
    mode,
    form,
    store,
    timezone,
}: TimezoneSectionProps) {
    return (
        <section className="space-y-4">
            <div>
                <h3 className="text-sm font-semibold text-foreground">
                    Timezone
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Used to localize alert notification timestamps.
                </p>
            </div>
            {mode !== "view" ? (
                <div className="max-w-sm">
                    <TimezoneCombobox
                        value={form.timezone}
                        onValueChange={store.set("timezone")}
                    />
                </div>
            ) : (
                <div className="max-w-sm">
                    <InfoBlock
                        icon={<Clock size={15} />}
                        label="Timezone"
                        value={
                            timezone
                                ? `${timezone} (${tzOffsetLabel(timezone)})`
                                : "—"
                        }
                    />
                </div>
            )}
        </section>
    );
}
