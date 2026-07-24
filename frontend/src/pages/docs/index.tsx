import { useEffect } from "react";
import { BookOpen, Bell } from "lucide-react";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import PageLayout from "@/components/PageLayout";
import IndexHeader from "@/components/IndexHeader";
import DocCard from "@/components/docs/DocCard";

export default function Docs() {
    const { setTrail } = useBreadcrumb();

    useEffect(() => {
        setTrail([{ label: "Docs" }]);
    }, [setTrail]);

    return (
        <PageLayout>
            <IndexHeader
                icon={BookOpen}
                title="Docs"
                description="System documentation and reference guides."
            />

            <main className="w-full flex-1 mt-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DocCard
                        title="Alerts"
                        description="Node-based alerting system — configuration, evaluation flow, and timer-based scheduling."
                        icon={Bell}
                        href="/docs/alerts"
                    />
                </div>
            </main>
        </PageLayout>
    );
}
