import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCoop, useUpdateCoop } from "@/hooks/useCoops";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import { CoopForm } from "@/components/CoopForm";
import { Loader2 } from "lucide-react";

export default function CoopEdit() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { setTrail } = useBreadcrumb();
    const coopId = Number(id);

    const { data: coop, isLoading, error } = useCoop(coopId);
    const updateCoop = useUpdateCoop(coopId);

    useEffect(() => {
        setTrail([
            { label: "Coops", href: "/coops" },
            { label: `Edit${coop ? `: ${coop.name}` : ""}`, href: `/coops/${id}/edit` },
        ]);
    }, [setTrail, id, coop]);

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !coop) {
        return (
            <div className="flex-1 flex items-center justify-center text-sm text-destructive">
                Failed to load coop
            </div>
        );
    }

    return (
        <CoopForm
            title={`Edit: ${coop.name}`}
            initial={{
                name: coop.name,
                description: coop.description ?? "",
                location: coop.location ?? "",
                email: coop.email,
                contact_number: coop.contact_number ?? "",
                banner_picture: coop.banner_picture ?? "",
            }}
            onSubmit={async (data) => {
                await updateCoop.mutateAsync(data);
                navigate("/coops");
            }}
            isPending={updateCoop.isPending}
        />
    );
}
