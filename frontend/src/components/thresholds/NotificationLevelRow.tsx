import {
    Trash2,
    Mail,
    Smartphone,
    Bell,
    TriangleAlert,
    ShieldAlert,
} from "lucide-react";

import type {
    NotificationLevel,
    NotificationSeverity,
} from "./types";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";

interface Props {
    level: NotificationLevel;

    onChange: (level: NotificationLevel) => void;

    onDelete: () => void;
}

const severities: NotificationSeverity[] = [
    "light",
    "warning",
    "critical",
];

export default function NotificationLevelRow({
    level,
    onChange,
    onDelete,
}: Props) {
    const update = <K extends keyof NotificationLevel>(
        key: K,
        value: NotificationLevel[K]
    ) => {
        onChange({
            ...level,
            [key]: value,
        });
    };

    const toggleChannel = (
        channel: "email" | "sms"
    ) => {
        if (level.channels.includes(channel)) {
            update(
                "channels",
                level.channels.filter(
                    (c) => c !== channel
                )
            );
        } else {
            update("channels", [
                ...level.channels,
                channel,
            ]);
        }
    };

    return (
        <div className="rounded-xl border border-border p-4 space-y-4">

            <div className="flex justify-between items-center">

                <h4 className="font-medium">
                    Notification Level
                </h4>

                <button
                    onClick={onDelete}
                    className="text-destructive hover:opacity-80"
                >
                    <Trash2 className="w-4 h-4" />
                </button>

            </div>

            {/* Name */}

            <div className="space-y-2">

                <label className="text-sm font-medium">
                    Name
                </label>

                <input
                    value={level.name}
                    onChange={(e) =>
                        update("name", e.target.value)
                    }
                    className="w-full rounded-md border px-3 py-2"
                />

            </div>

            {/* Threshold */}

            <div className="space-y-2">

                <label className="text-sm font-medium">
                    Threshold
                </label>

                <div className="flex items-center gap-2">

                    <input
                        type="number"
                        min={0}
                        max={100}
                        value={level.threshold}
                        onChange={(e) =>
                            update(
                                "threshold",
                                Number(e.target.value)
                            )
                        }
                        className="w-28 rounded-md border px-3 py-2"
                    />

                    %

                </div>

            </div>

            {/* Severity */}

            <div className="space-y-2">

                <label className="text-sm font-medium">
                    Severity
                </label>

                <Select
                    value={level.severity}
                    onValueChange={(value) =>
                        onChange({
                            ...level,
                            severity: value as NotificationLevel["severity"],
                        })
                    }
                >
                    <SelectTrigger className="w-40">
                        <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                        <SelectItem value="light">
                            🟢 Light
                        </SelectItem>

                        <SelectItem value="warning">
                            🟡 Warning
                        </SelectItem>

                        <SelectItem value="critical">
                            🔴 Critical
                        </SelectItem>
                    </SelectContent>
                </Select>

            </div>

            {/* Channels */}

            <div className="space-y-2">

                <label className="text-sm font-medium">
                    Notification Channels
                </label>

                <div className="flex gap-3">

                    <Button
                        variant={
                            level.channels.includes("email")
                                ? "default"
                                : "outline"
                        }
                        label="Email"
                        icon={<Mail className="w-4 h-4" />}
                        onClick={() =>
                            toggleChannel("email")
                        }
                    />

                    <Button
                        variant={
                            level.channels.includes("sms")
                                ? "default"
                                : "outline"
                        }
                        label="SMS"
                        icon={
                            <Smartphone className="w-4 h-4" />
                        }
                        onClick={() =>
                            toggleChannel("sms")
                        }
                    />

                </div>

            </div>

        </div>
    );
}