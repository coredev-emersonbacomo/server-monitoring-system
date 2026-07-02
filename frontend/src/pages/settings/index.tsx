import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserCircle, Monitor, ChevronRight, Loader2, Settings as SettingsIcon, Activity } from "lucide-react";
import { useJwtAuth } from "@/hooks/useJwtAuth";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import PageLayout from "@/components/PageLayout";

function Settings() {
    const { user, isLoading: authLoading } = useJwtAuth();
    const { setTrail } = useBreadcrumb();
    const navigate = useNavigate();

    useEffect(() => {
        setTrail([{ label: "Settings" }]);
    }, [setTrail]);

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
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
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
            title: "Alert Thresholds",
            description: "Configure CPU, RAM, and Storage thresholds for global server alerts.",
            icon: Activity,
            href: "/settings/thresholds",
        }
    ];

    return (
        <PageLayout>
            <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
                <div className="flex items-start justify-between gap-4 py-3 px-6 sm:px-8 lg:px-10">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg mt-0.5">
                            <UserCircle className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold tracking-tight">
                                Settings
                            </h1>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Manage your account settings and preferences.
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="py-6 w-full flex-1">
                <div className="max-w-2xl mx-auto px-6 sm:px-8 lg:px-10 flex flex-col gap-3">
                    {settingsSections.map((section) => (
                        <button
                            key={section.href}
                            onClick={() => navigate(section.href)}
                            className="flex items-center gap-4 p-4 bg-card border border-border/60 rounded-xl shadow-sm hover:shadow-md hover:border-border transition-all text-left group"
                        >
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
                        </button>
                    ))}
                </div>
            </main>
        </PageLayout>
    );
}

export default Settings;