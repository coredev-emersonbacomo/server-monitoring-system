import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateClient } from "@/hooks/useClients";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import { ClientForm } from "@/components/ClientForm";

export default function ClientCreate() {
    const navigate = useNavigate();
    const { setTrail } = useBreadcrumb();
    const createClient = useCreateClient();

    useEffect(() => {
        setTrail([
            { label: "Clients", href: "/clients" },
            { label: "Create", href: "/clients/create" },
        ]);
    }, [setTrail]);

    return (
        <ClientForm
            title="Create Client"
            onSubmit={async (data) => {
                await createClient.mutateAsync(data);
                navigate("/clients");
            }}
            isPending={createClient.isPending}
        />
    );
}
