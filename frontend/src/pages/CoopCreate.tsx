import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateCoop } from "@/hooks/useCoops";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import { CoopForm } from "@/components/CoopForm";

export default function CoopCreate() {
    const navigate = useNavigate();
    const { setTrail } = useBreadcrumb();
    const createCoop = useCreateCoop();

    useEffect(() => {
        setTrail([
            { label: "Coops", href: "/coops" },
            { label: "Create", href: "/coops/create" },
        ]);
    }, [setTrail]);

    return (
        <CoopForm
            title="Create Coop"
            onSubmit={async (data) => {
                await createCoop.mutateAsync(data);
                navigate("/coops");
            }}
            isPending={createCoop.isPending}
        />
    );
}
