import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";

interface AddSecopDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientName?: string;
    secopLimit: number;
    availableSecops: Array<{
        uuid: string;
        first_name: string;
        last_name: string;
        email: string;
        profile_picture_url?: string;
    }>;
    isLoading: boolean;
    isAdding: boolean;
    onAddSecop: (userUuid: string, userName: string) => void;
}

export function AddSecopDialog({
    open,
    onOpenChange,
    clientName,
    secopLimit,
    availableSecops,
    isLoading,
    isAdding,
    onAddSecop,
}: AddSecopDialogProps) {
    const [secopSearch, setSecopSearch] = useState("");
    const [selectedSecopToAdd, setSelectedSecopToAdd] = useState<string | null>(
        null,
    );

    const filtered = availableSecops.filter((user) => {
        const q = secopSearch.trim().toLowerCase();
        if (!q) return true;
        return (
            `${user.first_name} ${user.last_name}`
                .toLowerCase()
                .includes(q) ||
            user.email.toLowerCase().includes(q)
        );
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add SecOps</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                    <p className="text-xs text-muted-foreground">
                        Select a SecOps account to assign to this client. You can
                        add up to{" "}
                        <span className="font-semibold">{secopLimit}</span> SecOps
                        per client.
                    </p>
                    <div className="relative">
                        <Search
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />

                        <input
                            type="text"
                            value={secopSearch}
                            onChange={(e) => setSecopSearch(e.target.value)}
                            placeholder="Search SecOps..."
                            className="w-full h-10 rounded-lg border border-border bg-background pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    {isLoading ? (
                        <div className="space-y-2">
                            {[0, 1, 2].map((i) => (
                                <div
                                    key={i}
                                    className="h-10 bg-muted rounded animate-pulse"
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {filtered.map((user) => (
                                <button
                                    key={user.uuid}
                                    onClick={() => {
                                        setSelectedSecopToAdd(user.uuid);
                                        onAddSecop(
                                            user.uuid,
                                            `${user.first_name} ${user.last_name}`,
                                        );
                                    }}
                                    disabled={
                                        isAdding ||
                                        selectedSecopToAdd === user.uuid
                                    }
                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors disabled:opacity-50 text-left border border-border/40 hover:border-border cursor-pointer"
                                >
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-muted shrink-0">
                                            <img
                                                src={user.profile_picture_url}
                                                alt={`${user.first_name} ${user.last_name}`}
                                                className="h-full w-full object-cover"
                                                onError={(e) => {
                                                    (
                                                        e.target as HTMLImageElement
                                                    ).style.display = "none";
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {user.first_name} {user.last_name}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {user.email}
                                        </p>
                                    </div>
                                    {selectedSecopToAdd === user.uuid &&
                                        isAdding && (
                                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                        )}
                                </button>
                            ))}
                            {filtered.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    {secopSearch
                                        ? "No matching SecOps found."
                                        : "All users are already assigned to this client."}
                                </p>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <DialogClose asChild>
                        <Button
                            variant="outline"
                            label="Close"
                            onClick={() => onOpenChange(false)}
                        />
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    );
}
