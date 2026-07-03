import { useEffect, useState } from "react";
import { Plus, Save } from "lucide-react";

import NotificationLevelRow from "./NotificationLevelRow";
import type { NotificationLevel } from "./types";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;

    metricTitle: string;

    levels: NotificationLevel[];

    onSave: (levels: NotificationLevel[]) => void;
}

export default function NotificationLevelDialog({
    open,
    onOpenChange,
    metricTitle,
    levels,
    onSave,
}: Props) {
    const [localLevels, setLocalLevels] =
        useState<NotificationLevel[]>([]);

    useEffect(() => {
        if (open) {
            setLocalLevels(levels);
        }
    }, [levels, open]);

    const updateLevel = (
        index: number,
        updated: NotificationLevel
    ) => {
        const copy = [...localLevels];
        copy[index] = updated;
        setLocalLevels(copy);
    };

    const removeLevel = (index: number) => {
        setLocalLevels((prev) =>
            prev.filter((_, i) => i !== index)
        );
    };

    const addLevel = () => {
        setLocalLevels((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                name: "",
                threshold: 0,
                severity: "light",
                channels: [],
            },
        ]);
    };

    const validate = () => {
        for (const level of localLevels) {
            if (!level.name.trim()) {
                alert("Every notification level needs a name.");
                return false;
            }

            if (
                level.threshold < 0 ||
                level.threshold > 100
            ) {
                alert(
                    "Threshold must be between 0 and 100."
                );
                return false;
            }

            if (level.channels.length === 0) {
                alert(
                    "Every notification level must have at least one notification channel."
                );
                return false;
            }
        }

        const thresholds = localLevels.map(
            (l) => l.threshold
        );

        if (
            new Set(thresholds).size !==
            thresholds.length
        ) {
            alert("Duplicate thresholds are not allowed.");
            return false;
        }

        return true;
    };

    const handleSave = () => {
        if (!validate()) return;

        const sorted = [...localLevels].sort(
            (a, b) => a.threshold - b.threshold
        );

        onSave(sorted);

        onOpenChange(false);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
        >
            <DialogContent className="max-w-3xl">

                <DialogHeader>

                    <DialogTitle>
                        Configure {metricTitle}
                    </DialogTitle>

                </DialogHeader>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">

                    {localLevels.length === 0 && (
                        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
                            No notification levels yet.
                        </div>
                    )}

                    {localLevels.map((level, index) => (
                        <NotificationLevelRow
                            key={level.id}
                            level={level}
                            onChange={(updated) =>
                                updateLevel(
                                    index,
                                    updated
                                )
                            }
                            onDelete={() =>
                                removeLevel(index)
                            }
                        />
                    ))}

                    <Button
                        variant="outline"
                        label="Add Notification Level"
                        icon={<Plus className="w-4 h-4" />}
                        onClick={addLevel}
                    />

                </div>

                <div className="flex justify-end gap-2">

                    <Button
                        variant="outline"
                        label="Cancel"
                        onClick={() =>
                            onOpenChange(false)
                        }
                    />

                    <Button
                        label="Save"
                        icon={<Save className="w-4 h-4" />}
                        onClick={handleSave}
                    />

                </div>

            </DialogContent>
        </Dialog>
    );
}