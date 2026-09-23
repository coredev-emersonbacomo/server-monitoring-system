import { Link } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
    UserCircle,
    Monitor,
    ChevronRight,
    Loader2,
    Settings as SettingsIcon,
    GitBranch,
    Cpu,
    BookOpen,
    Activity,
    FolderSearch,
} from "lucide-react";
import { useJwtAuth } from "@/hooks/useJwtAuth";
import IndexHeader from "@/components/IndexHeader";
import PageLayout from "@/components/PageLayout";

const SHOW_PIPELINE_VISUALIZER = import.meta.env.VITE_ALERTS_VISUAL_DEBUGGER === "true";
// Empty fallback keeps the link relative (/docs/...) so it resolves through
// the frontend /docs proxy on whatever origin serves the app.
const DOCS_BASE_URL = import.meta.env.VITE_DOCS_URL || "";

function Settings() {
    useDocumentTitle("Settings");
    const { user, isLoading: authLoading } = useJwtAuth();

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                <p className="text-muted-foreground text-sm">
                    Loading settings...
                </p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] gap-3">
                <p className="text-muted-foreground text-sm">
                    Please log in to access settings.
                </p>
            </div>
        );
    }

    const settingsSections = [
        {
            title: "Profile",
            description: "Manage your personal information and avatar.",
            icon: UserCircle,
            href: "/profile",
        },
        {
            title: "Sessions & Devices",
            description:
                "Manage where your account is signed in and review recent activity.",
            icon: Monitor,
            href: "/settings/sessions",
        },
        {
            title: "System Settings",
            description: "Manage the system settings and preferences.",
            icon: SettingsIcon,
            href: "/settings/system",
        },
        {
            title: "Agent Settings",
            description:
                "Manage agent heartbeat, offline threshold, and version tracking.",
            icon: Cpu,
            href: "/settings/agent",
        },
        {
            title: "File Activity Monitoring",
            description:
                "Configure which paths the agent audits on monitored servers.",
            icon: FolderSearch,
            href: "/settings/file-activity",
        },
        {
            title: "Alert Configs",
            description:
                "Build visual alert configurations with conditions, delays, and notifications.",
            icon: GitBranch,
            href: "/settings/alerts",
        },
        ...(SHOW_PIPELINE_VISUALIZER
            ? [
                {
                    title: "System Pipeline Visualizer",
                    description:
                        "Real-time ecosystem map showing agent heartbeats, metrics flow particles, backend FSM evaluations, and exact scheduled timers.",
                    icon: Activity,
                    href: "/settings/alerts/debugger",
                } as const,
            ]
            : []),
        {
            title: "Docs",
            description:
                "System documentation and reference guides.",
            icon: BookOpen,
            href: `${DOCS_BASE_URL}/docs/overview`,
            external: true,
        },
    ];

    return (
        <PageLayout>
            <IndexHeader
                icon={UserCircle}
                title="Settings"
                description="Manage your account settings and preferences."
                trail={[{ label: "Settings" }]}
            />

            <main className="py-6 w-full flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-12xl mx-auto px-6 sm:px-8 lg:px-10">
                    {settingsSections.map((section) => {
                        const content = (
                            <>
                                <div className="p-2.5 bg-primary/10 rounded-lg shrink-0">
                                    <section.icon className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm">
                                        {section.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {section.description}
                                    </p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                            </>
                        );

                        if ('external' in section && section.external) {
                            return (
                                <a
                                    key={section.href}
                                    href={section.href}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-4 p-4 bg-card border border-border/60 rounded-xl shadow-sm hover:shadow-md hover:border-border transition-all text-left group cursor-pointer"
                                >
                                    {content}
                                </a>
                            );
                        }

                        return (
                            <Link
                                key={section.href}
                                to={section.href}
                                className="flex items-center gap-4 p-4 bg-card border border-border/60 rounded-xl shadow-sm hover:shadow-md hover:border-border transition-all text-left group cursor-pointer"
                            >
                                {content}
                            </Link>
                        );
                    })}
                </div>
            </main>
        </PageLayout>
    );
}

export default Settings;
