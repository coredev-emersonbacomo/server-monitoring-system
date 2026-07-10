import { useEffect } from "react";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import PageLayout from "@/components/PageLayout";
import { NodeConfigEditor } from "@/components/node-config/NodeConfigEditor";

export default function NodeConfigsIndex() {
    const { setTrail } = useBreadcrumb();

    useEffect(() => {
        setTrail([
            { label: "Settings", href: "/settings" },
            { label: "Alert Config" },
        ]);
    }, [setTrail]);

    return (
        <PageLayout>
            <NodeConfigEditor
                configKey="alerts"
                defaultName="Alert Config"
            />
        </PageLayout>
    );
}
