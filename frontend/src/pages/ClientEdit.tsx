import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useClient, useUpdateClient } from "@/hooks/useClients";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import { ClientForm } from "@/components/ClientForm";
import { Loader2 } from "lucide-react";

export default function ClientEdit() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { setTrail } = useBreadcrumb();
    const clientId = Number(id);

    const { data: client, isLoading, error } = useClient(clientId);
    const updateClient = useUpdateClient(clientId);

    useEffect(() => {
        setTrail([
            { label: "Clients", href: "/clients" },
            { label: `Edit${client ? `: ${client.name}` : ""}`, href: `/clients/${id}/edit` },
        ]);
    }, [setTrail, id, client]);

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !client) {
        return (
            <div className="flex-1 flex items-center justify-center text-sm text-destructive">
                Failed to load client
            </div>
        );
    }

    return (
        <ClientForm
            title={`Edit: ${client.name}`}
            initialBannerUrl={client.banner_image_url || undefined}
            onSubmit={async (formData) => {
                await updateClient.mutateAsync(formData);
                navigate("/clients");
            }}
            isPending={updateClient.isPending}
        />
    );
}
