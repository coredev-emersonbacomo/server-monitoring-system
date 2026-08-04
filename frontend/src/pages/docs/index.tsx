import { BookOpen, Bell, Mail, Database } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import IndexHeader from "@/components/IndexHeader";
import DocCard from "@/components/docs/DocCard";

export default function Docs() {
    return (
        <PageLayout>
            <IndexHeader
                icon={BookOpen}
                title="Docs"
                description="System documentation and reference guides."
                trail={[{ label: "Docs" }]}
            />

            <main className="w-full flex-1 mt-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DocCard
                        title="Alerts"
                        description="Node-based alerting system — configuration, evaluation flow, and timer-based scheduling."
                        icon={Bell}
                        href="/docs/alerts"
                    />
                    <DocCard
                        title="Gmail SMTP Setup"
                        description="How email notifications are sent through a Gmail account."
                        icon={Mail}
                        href="/docs/gmail-smtp"
                    />
                    <DocCard
                        title="Storage Providers"
                        description="Pluggable storage provider system for file uploads."
                        icon={Database}
                        href="/docs/storage-providers"
                    />
                </div>
            </main>
        </PageLayout>
    );
}
