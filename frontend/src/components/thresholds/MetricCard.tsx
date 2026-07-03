import { useState } from "react";
import {
    Settings2,
    Bell,
    TriangleAlert,
    ShieldAlert,
} from "lucide-react";

import NotificationLevelDialog from "./NotificationLevelDialog";
import type { NotificationLevel } from "./types";

import { Button } from "@/components/ui/button";

interface MetricCardProps {
    metricId: string;

    title: string;

    description: string;

    icon: React.ReactNode;

    levels: NotificationLevel[];

    onSave: (
        metricId: string,
        levels: NotificationLevel[]
    ) => void;
}

export default function MetricCard({
    metricId,
    title,
    description,
    icon,
    levels,
    onSave,
}: MetricCardProps) {
    const [open, setOpen] = useState(false);

    const getSeverityIcon = (
        severity: NotificationLevel["severity"]
    ) => {
        switch (severity) {
            case "light":
                return (
                    <Bell className="w-4 h-4 text-blue-500" />
                );

            case "warning":
                return (
                    <TriangleAlert className="w-4 h-4 text-yellow-500" />
                );

            case "critical":
                return (
                    <ShieldAlert className="w-4 h-4 text-red-500" />
                );
        }
    };

    const sortedLevels = [...levels].sort(
        (a, b) => a.threshold - b.threshold
    );

    return (
        <>
            <div className="rounded-xl border border-border bg-card shadow-sm">

                {/* Header */}

                <div className="border-b border-border p-4 sm:p-6">

                    <div className="flex items-start justify-between gap-4">

                        <div className="flex flex-1 min-w-0 gap-3">

                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                {icon}
                            </div>

                            <div className="min-w-0">

                                <h2 className="font-semibold text-base sm:text-lg">
                                    {title}
                                </h2>

                                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                                    {description}
                                </p>

                            </div>

                        </div>

                        <button
                            onClick={() => setOpen(true)}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
                        >
                            <Settings2 className="h-5 w-5" />
                        </button>

                    </div>

                </div>

                {/* Content */}

                <div className="p-4 sm:p-6">

                    {sortedLevels.length === 0 ? (

                        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                            No notification levels configured.
                        </div>

                    ) : (

                        <div className="space-y-3">

                            {sortedLevels.map((level) => (

                                <div
                                    key={level.id}
                                    className="rounded-lg border p-4"
                                >

                                    <div className="flex items-start justify-between gap-4">

                                        <div className="flex min-w-0 items-center gap-3">

                                            <div className="shrink-0">
                                                {getSeverityIcon(level.severity)}
                                            </div>

                                            <div className="min-w-0">

                                                <p className="font-medium break-words">
                                                    {level.name}
                                                </p>

                                                <p className="text-sm text-muted-foreground break-words">
                                                    {level.channels.join(", ")}
                                                </p>

                                            </div>

                                        </div>

                                        <div className="shrink-0 text-xl font-bold">
                                            {level.threshold}%
                                        </div>

                                    </div>

                                </div>

                            ))}

                        </div>

                    )}

                </div>

            </div>

            <NotificationLevelDialog
                open={open}
                onOpenChange={setOpen}
                metricTitle={title}
                levels={levels}
                onSave={(updatedLevels) =>
                    onSave(metricId, updatedLevels)
                }
            />
        </>
    );
}