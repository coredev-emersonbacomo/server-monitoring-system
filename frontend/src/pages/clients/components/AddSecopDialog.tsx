import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { DebouncedSearchInput } from "@/components/DebouncedSearchInput";
import { useUrlState } from "@/hooks/useUrlState";
import { useUsers } from "@/hooks/useUsers";
import type { UserData } from "@/types/models";
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
    excludedUuids: string[];
    isAdding: boolean;
    onAddSecop: (user: UserData) => void;
    paramName?: string;
}

export function AddSecopDialog({
    open,
    onOpenChange,
    secopLimit,
    excludedUuids,
    isAdding,
    onAddSecop,
    paramName = "secop_q",
}: AddSecopDialogProps) {
    const { data: currentUser } = useAuth();
    const [selectedSecopToAdd, setSelectedSecopToAdd] = useState<string | null>(
        null,
    );

    // NOTE: read the same param the search input writes (paramName, not "q")
    // so dialog filtering doesn't clobber the parent page's own ?q= search.
    const [s] = useUrlState({ [paramName]: { default: "" } });
    const { data: response, isLoading } = useUsers({
        q: s[paramName] || undefined,
        exclude_user_uuid: excludedUuids.join(",") || undefined,
        per_page: 50,
    });
    const users = useMemo(() => response?.data ?? [], [response]);

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
                    <DebouncedSearchInput
                        paramName={paramName}
                        debounceMs={300}
                        placeholder="Search SecOps..."
                    />

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
                            {users.map((user) => (
                                <button
                                    key={user.uuid}
                                    onClick={() => {
                                        setSelectedSecopToAdd(user.uuid);
                                        onAddSecop(user);
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
                                            {user.uuid === currentUser?.uuid && (
                                                <span className="text-[12px] font-semibold ml-1 text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
                                                    (You)
                                                </span>
                                            )}
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
                            {users.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    {s.q
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
