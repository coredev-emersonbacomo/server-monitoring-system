import { Clock } from "lucide-react";
import { TimezoneCombobox, tzOffsetLabel } from "@/components/TimezoneCombobox";
import { InfoBlock } from "./InfoBlock";

interface TimezoneSectionProps {
    mode: "view" | "edit" | "create";
    form: Record<string, string>;
    store: { set: (key: string) => (value: string) => void };
    timezone?: string;
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
