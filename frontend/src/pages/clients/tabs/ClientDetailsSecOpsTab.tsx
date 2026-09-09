import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { ClientData, SecopsUserData } from "@/types/models";
import type { useRemoveClientSecop } from "@/hooks/useClients";

interface ClientDetailsSecOpsTabProps {
    client: ClientData;
    currentSecops: SecopsUserData[];
    secopLoading: boolean;
    secopLimit: number;
    onAddClick: () => void;
    removeSecop: ReturnType<typeof useRemoveClientSecop>;
}

export function ClientDetailsSecOpsTab({
    client,
    currentSecops,
    secopLoading,
    secopLimit,
    onAddClick,
    removeSecop,
}: ClientDetailsSecOpsTabProps) {
    const navigate = useNavigate();

    return (
        <div className="bg-card border border-border/60 shadow-sm p-6 sm:p-8 flex flex-col gap-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-base font-semibold text-foreground">SecOps Assignments</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Manage SecOps personnel assigned to this client.
                    </p>
                </div>
                <Button
                    className="cursor-pointer"
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={<Plus size={14} />}
                    label="Add SecOps"
                    onClick={onAddClick}
                    disabled={currentSecops.length >= secopLimit}
                />
            </div>

            {secopLoading ? (
                <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                    ))}
                </div>
            ) : currentSecops.length > 0 ? (
                <div className="space-y-2">
                    {currentSecops.map((secop: SecopsUserData) => (
                        <div
                            key={secop.uuid}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors"
                        >
                            <div
                                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => navigate(`/users/${secop.uuid}`)}
                            >
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-muted shrink-0">
                                    <img
                                        src={secop.profile_picture_url}
                                        alt={`${secop.first_name} ${secop.last_name}`}
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = "none";
                                        }}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                        {secop.first_name} {secop.last_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">{secop.email}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() =>
                                    removeSecop.mutate(secop.uuid, {
                                        onSuccess: () => {
                                            toast.error(`${secop.first_name} removed from ${client?.name}.`);
                                        },
                                        onError: () => {
                                            toast.error("Failed to remove SecOps.");
                                        },
                                    })
                                }
                                disabled={removeSecop.isPending}
                                className="text-xs text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2 bg-muted/20 rounded-lg border border-border/40">
                    <p className="text-sm">No SecOps assigned yet.</p>
                    <p className="text-xs">
                        Add up to <span className="font-semibold">{secopLimit}</span> SecOps to this client.
                    </p>
                </div>
            )}
        </div>
    );
}
