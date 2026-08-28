import { useMemo } from "react";
import { Landmark } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DebouncedSearchInput } from "@/components/DebouncedSearchInput";
import { useUrlState } from "@/hooks/useUrlState";
import { useClients } from "@/hooks/useClients";

interface SelectClientDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    onSelectClient: (clientUuid: string) => void;
    paramName?: string;
}

export function SelectClientDialog({
    open,
    onOpenChange,
    title,
    description,
    onSelectClient,
    paramName = "client_q",
}: SelectClientDialogProps) {
    const [s] = useUrlState({
        q: { default: "" },
    });
    const { data: response, isLoading } = useClients({
        q: s.q || undefined,
        per_page: 50,
    });
    const clients = useMemo(() => response?.data ?? [], [response]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                    <p className="text-xs text-muted-foreground">
                        {description}
                    </p>
                    <DebouncedSearchInput
                        paramName={paramName}
                        debounceMs={300}
                        placeholder="Search clients…"
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
                            {clients.map((c) => (
                                <button
                                    key={c.uuid}
                                    onClick={() => {
                                        onOpenChange(false);
                                        onSelectClient(c.uuid);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left border border-border/40 hover:border-border cursor-pointer"
                                >
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <Landmark size={14} className="text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {c.name}
                                        </p>
                                        {c.location && (
                                            <p className="text-xs text-muted-foreground truncate">
                                                {c.location}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            ))}
                            {clients.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No matching clients found.
                                </p>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <DialogClose asChild>
                        <Button variant="outline" label="Cancel" />
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    );
}
