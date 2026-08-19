import { useEffect, useRef, useState, type ComponentType } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import {
    BookOpen,
    Bell,
    Database,
    Cpu,
    Terminal,
    Settings2,
    Rocket,
    Activity,
    Landmark,
    Server,
    Users,
    ScrollText,
    FileBarChart,
    Wrench,
    Network,
    Bot,
    Clock,
    FileText,
    KeyRound,
    Workflow,
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
    type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import DocCard from "@/components/docs/DocCard";
import {
    DocsSidebar,
    DocsNav,
    type DocsSection,
    type DocSubItem,
} from "@/components/docs/DocsSidebar";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
    DocsOverviewContent,
    DocsRequirementsContent,
    DocsInstallationContent,
    DocsConfigurationContent,
    DocsRunningContent,
} from "@/components/docs/DocsDeploymentContent";
import {
    DocsDashboardContent,
    DocsClientsContent,
    DocsServersContent,
    DocsUsersContent,
    DocsLogsContent,
    DocsReportsContent,
    DocsSettingsContent,
    DocsAlertConfiguratorContent,
} from "@/components/docs/DocsUserGuideContent";
import {
    DocsArchitectureContent,
    DocsAgentContent,
    DocsSchedulingContent,
    DocsAdrContent,
    DocsCredentialsContent,
} from "@/components/docs/DocsTechnicalContent";
import { DocsAlertsContent } from "@/components/docs/DocsAlertsContent";
import { DocsStorageProvidersContent } from "@/components/docs/DocsStorageProvidersContent";

const DOC_SECTIONS: DocsSection[] = [
    {
        id: "overview",
        label: "Overview",
        icon: BookOpen,
        group: "User Guide",
    },
    {
        id: "requirements",
        label: "Requirements",
        icon: Cpu,
        group: "User Guide",
    },
    {
        id: "installation",
        label: "Installation & Setup",
        icon: Terminal,
        group: "User Guide",
    },
    {
        id: "configuration",
        label: "Configuration",
        icon: Settings2,
        group: "User Guide",
    },
    {
        id: "running",
        label: "Running the App",
        icon: Rocket,
        group: "User Guide",
    },
    {
        id: "dashboard",
        label: "Dashboard",
        icon: Activity,
        group: "User Guide",
    },
    {
        id: "clients",
        label: "Clients",
        icon: Landmark,
        group: "User Guide",
    },
    {
        id: "servers",
        label: "Servers",
        icon: Server,
        group: "User Guide",
    },
    {
        id: "users",
        label: "Users",
        icon: Users,
        group: "User Guide",
    },
    {
        id: "logs",
        label: "Logs",
        icon: ScrollText,
        group: "User Guide",
    },
    {
        id: "reports",
        label: "Reports",
        icon: FileBarChart,
        group: "User Guide",
    },
    {
        id: "settings",
        label: "Settings",
        icon: Wrench,
        group: "User Guide",
    },
    {
        id: "alert-editor",
        label: "Alert Config Editor",
        icon: Workflow,
        group: "User Guide",
    },
    {
        id: "adrs",
        label: "ADRs",
        icon: FileText,
        group: "Technical Reference",
    },
    {
        id: "agent-flow",
        label: "Agent Flow",
        icon: Bot,
        group: "Technical Reference",
    },
    {
        id: "credentials",
        label: "Credentials Storage",
        icon: KeyRound,
        group: "Technical Reference",
    },
    {
        id: "architecture",
        label: "Architecture",
        icon: Network,
        group: "Technical Reference",
    },
    {
        id: "alerting",
        label: "Alerting System",
        icon: Bell,
        group: "Technical Reference",
    },
    {
        id: "storage-providers",
        label: "Storage Providers",
        icon: Database,
        group: "Technical Reference",
    },
    {
        id: "scheduling",
        label: "Background Jobs & Scheduling",
        icon: Clock,
        group: "Technical Reference",
    },
];

const PAGES: Record<
    string,
    { title: string; description: string; Content: ComponentType }
> = {
    "requirements": {
        title: "Requirements",
        description:
            "Software and services required to install and run the system.",
        Content: DocsRequirementsContent,
    },
    "installation": {
        title: "Installation & Setup",
        description: "From cloning the repository to a running system.",
        Content: DocsInstallationContent,
    },
    "configuration": {
        title: "Configuration",
        description: "Environment files, key variables, and Gmail SMTP.",
        Content: DocsConfigurationContent,
    },
    "running": {
        title: "Running the App",
        description: "Dev workflow, production build, and deployment.",
        Content: DocsRunningContent,
    },
    "dashboard": {
        title: "Dashboard",
        description:
            "Stat cards, server overview, action board, and live usage charts.",
        Content: DocsDashboardContent,
    },
    "clients": {
        title: "Clients",
        description:
            "Manage client accounts, their servers, and SecOps assignments.",
        Content: DocsClientsContent,
    },
    "servers": {
        title: "Servers",
        description: "Create servers, install the agent, and monitor metrics.",
        Content: DocsServersContent,
    },
    "users": {
        title: "Users",
        description: "Manage accounts, credentials, and client assignments.",
        Content: DocsUsersContent,
    },
    "logs": {
        title: "Logs",
        description: "Activity, server health, and agent audit logs.",
        Content: DocsLogsContent,
    },
    "reports": {
        title: "Reports",
        description:
            "Generate PDF reports for servers, clients, and the whole system.",
        Content: DocsReportsContent,
    },
    "settings": {
        title: "Settings",
        description:
            "Profile, sessions, system settings, agent settings, and alert configs.",
        Content: DocsSettingsContent,
    },
    "alert-editor": {
        title: "Alert Config Editor",
        description:
            "The visual node editor for alerts — every node type, wiring, scopes, and templates.",
        Content: DocsAlertConfiguratorContent,
    },
    "adrs": {
        title: "ADRs",
        description:
            "Architecture decision records — the decision log behind the system.",
        Content: DocsAdrContent,
    },
    "agent-flow": {
        title: "Agent Flow",
        description: "How the Go agent on each monitored server works.",
        Content: DocsAgentContent,
    },
    "credentials": {
        title: "Credentials Storage",
        description: "How secrets and credentials are stored and injected.",
        Content: DocsCredentialsContent,
    },
    "architecture": {
        title: "Architecture",
        description: "Components, data flow, and how the pieces fit together.",
        Content: DocsArchitectureContent,
    },
    "alerting": {
        title: "Alerting System",
        description:
            "The node-based alert engine — configuration, evaluation, and scheduling.",
        Content: DocsAlertsContent,
    },
    "storage-providers": {
        title: "Storage Providers",
        description: "Pluggable storage provider system for file uploads.",
        Content: DocsStorageProvidersContent,
    },
    "scheduling": {
        title: "Background Jobs & Scheduling",
        description: "Scheduled commands, queued jobs, and WebSocket channels.",
        Content: DocsSchedulingContent,
    },
};

const MANUAL_SUBS: Record<string, DocSubItem[]> = {
    alerting: [
        { id: "overview", label: "Overview", level: 1 },
        { id: "default-alert-graph", label: "Default Alert Graph", level: 1 },
        {
            id: "alert-flow-walkthrough",
            label: "Alert Flow Walkthrough",
            level: 1,
        },
        { id: "config-resolution", label: "Config Resolution", level: 1 },
        { id: "code-architecture", label: "Code Architecture", level: 1 },
        { id: "entry-points", label: "Entry Points", level: 2 },
        { id: "engine-trigger", label: "Engine: trigger()", level: 2 },
        {
            id: "timer-based-scheduling",
            label: "Timer-Based Scheduling",
            level: 2,
        },
        {
            id: "sustainednode-timer-flow",
            label: "SustainedNode Timer Flow",
            level: 2,
        },
        {
            id: "historical-condition-check",
            label: "Historical Condition Check",
            level: 2,
        },
        {
            id: "repeat-sustained-interaction",
            label: "Repeat + Sustained Interaction",
            level: 2,
        },
        { id: "state-persistence", label: "State Persistence", level: 2 },
        { id: "key-files", label: "Key Files", level: 2 },
    ],
};

function DocPager({
    prev,
    next,
    onGo,
}: {
    prev: DocsSection | null;
    next: DocsSection | null;
    onGo: (id: string) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4 mt-16 pt-8 border-t border-border/60">
            {prev ? (
                <button
                    type="button"
                    onClick={() => onGo(prev.id)}
                    className="group inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-muted/50 hover:border-border cursor-pointer"
                >
                    <ChevronLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
                    <span>{prev.label}</span>
                </button>
            ) : <div />}

            {next && (
                <button
                    type="button"
                    onClick={() => onGo(next.id)}
                    className="group inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-muted/50 hover:border-border cursor-pointer ml-auto"
                >
                    <span>{next.label}</span>
                    <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </button>
            )}
        </div>
    );
}

const LAYOUT_KEY = "docs-sidebar-layout";

function loadDocsLayout(): Record<string, number> {
    try {
        const parsed = localStorage.getItem(LAYOUT_KEY);
        if (parsed) return JSON.parse(parsed);
    } catch {
        // ignore malformed stored layout
    }
    return { "docs-sidebar": 20, "docs-content": 80 };
}

export default function Docs() {
    const { sectionId } = useParams();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [subSections, setSubSections] = useState<
        Record<string, DocSubItem[]>
    >(MANUAL_SUBS);
    const [activeSub, setActiveSub] = useState<string | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const hiddenRef = useRef<HTMLDivElement>(null);
    const pendingScroll = useRef<string | null>(null);
    const overrideSubRef = useRef(false);
    const userScrolledRef = useRef(false);
    const index = DOC_SECTIONS.findIndex((s) => s.id === sectionId);
    const current = index >= 0 ? DOC_SECTIONS[index] : null;
    const prev = index > 0 ? DOC_SECTIONS[index - 1] : null;
    const next =
        index >= 0 && index < DOC_SECTIONS.length - 1
            ? DOC_SECTIONS[index + 1]
            : null;

    useEffect(() => {
        const hidden = hiddenRef.current;
        if (hidden) {
            const map: Record<string, DocSubItem[]> = { ...MANUAL_SUBS };
            hidden
                .querySelectorAll<HTMLElement>("[data-docpage]")
                .forEach((pageEl) => {
                    const sid = pageEl.dataset.docpage;
                    if (!sid) return;
                    if (MANUAL_SUBS[sid]) return;
                    const items: DocSubItem[] = [];
                    pageEl
                        .querySelectorAll<HTMLElement>(
                            ":scope > section > h2[id], :scope > h2[id]",
                        )
                        .forEach((heading) => {
                            items.push({
                                id: heading.id,
                                label:
                                    heading.textContent?.trim() ||
                                    heading.id,
                                level: 1,
                            });
                        });
                    map[sid] = items;
                });
            setSubSections(map);
        }
    }, []);

    useEffect(() => {
        contentRef.current?.scrollTo(0, 0);
        const target = pendingScroll.current;
        pendingScroll.current = null;
        if (target) {
            setActiveSub(target);
        } else {
            overrideSubRef.current = false;
            setActiveSub(null);
        }
        if (target) {
            requestAnimationFrame(() => {
                contentRef.current
                    ?.querySelector<HTMLElement>(`#${CSS.escape(target)}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        }
    }, [current?.id]);

    const handleContentScroll = () => {
        const container = contentRef.current;
        if (!container) return;
        if (userScrolledRef.current) {
            userScrolledRef.current = false;
            overrideSubRef.current = false;
        }
        if (overrideSubRef.current) return;
        const headings = Array.from(
            container.querySelectorAll<HTMLElement>("h2[id]"),
        ).filter((heading) => {
            const section = heading.closest("section");
            return section && section.closest("section") === section;
        });
        if (headings.length === 0) {
            setActiveSub(null);
            return;
        }
        const maxScroll = container.scrollHeight - container.clientHeight;
        if (container.scrollTop >= maxScroll - 80) {
            setActiveSub(headings[headings.length - 1].id);
            return;
        }
        const offset = 60;
        let active: string | null = null;
        headings.forEach((heading) => {
            const top =
                heading.getBoundingClientRect().top -
                container.getBoundingClientRect().top;
            if (top <= offset) active = heading.id;
        });
        setActiveSub(active);
    };

    const jumpToSub = (sectionId: string, subId: string) => {
        overrideSubRef.current = true;
        setActiveSub(subId);
        if (sectionId === current?.id) {
            contentRef.current
                ?.querySelector<HTMLElement>(`#${CSS.escape(subId)}`)
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
            pendingScroll.current = subId;
            go(sectionId);
        }
    };

    if (!current) {
        return <Navigate to={`/docs/${DOC_SECTIONS[0].id}`} replace />;
    }

    const go = (id: string) => {
        navigate(`/docs/${id}`);
        setMobileOpen(false);
    };

    const page = PAGES[current.id];
    const isOverview = current.id === "overview";
    const currentSubs = subSections[current.id] ?? [];

    return (
        <div className="flex h-full flex-col w-full bg-background text-foreground">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="relative flex h-14 items-center px-4 sm:px-6">
                    <div className="absolute left-4 sm:left-6">
                        <button
                            type="button"
                            onClick={() => navigate("/")}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-all hover:bg-muted/50 hover:border-border cursor-pointer"
                        >
                            <ChevronLeft className="size-4" />
                            <span>Back</span>
                        </button>
                    </div>
                    <div className="flex flex-1 items-center justify-center gap-2">
                        <BookOpen className="size-5 text-foreground" />
                        <span className="font-semibold text-base tracking-tight">Server Monitoring Documentation</span>
                    </div>
                    <div className="absolute right-4 sm:right-6">
                        <button
                            type="button"
                            aria-label="Toggle docs navigation"
                            onClick={() => setMobileOpen((v) => !v)}
                            className="lg:hidden flex size-9 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:bg-muted transition cursor-pointer"
                        >
                            <Menu className="size-4.5" />
                        </button>
                    </div>
                </div>
            </header>

            <ResizablePanelGroup
                defaultLayout={loadDocsLayout()}
                onLayoutChanged={(layout) =>
                    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout))
                }
                className="flex-1 min-h-0 w-full"
            >
                {/* Left Sidebar */}
                <ResizablePanel
                    id="docs-sidebar"
                    minSize="15"
                    maxSize="30"
                    className="hidden lg:block border-r border-border/60 bg-background/50"
                >
                    <DocsSidebar
                        sections={DOC_SECTIONS}
                        activeId={current.id}
                        onJump={go}
                    />
                </ResizablePanel>
                <ResizableHandle withHandle className="hidden lg:flex" />

                {/* Main Content Area */}
                <ResizablePanel id="docs-content" minSize="50">
                    <div
                        ref={contentRef}
                        onScroll={handleContentScroll}
                        onWheel={() => {
                            userScrolledRef.current = true;
                        }}
                        onTouchMove={() => {
                            userScrolledRef.current = true;
                        }}
                        className="h-full overflow-y-auto"
                    >
                        <div className="mx-auto flex w-full max-w-7xl justify-center px-4 sm:px-8 py-10 lg:py-12">
                            {/* Center Article Content */}
                            <div className="min-w-0 max-w-3xl flex-1 pb-16">
                                {/* Breadcrumb */}
                                <nav className="mb-4 flex items-center space-x-1 text-sm text-muted-foreground">
                                    <span className="truncate">Docs</span>
                                    <ChevronRight className="size-3.5" />
                                    <span className="truncate">{current.group || "User Guide"}</span>
                                    <ChevronRight className="size-3.5" />
                                    <span className="font-medium text-foreground truncate">
                                        {isOverview ? "Overview" : page?.title}
                                    </span>
                                </nav>

                                {/* Header block (shadcn format) */}
                                <div className="space-y-2 pb-6 border-b border-border/50">
                                    <h1 className="scroll-m-20 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                                        {isOverview ? "Overview" : page?.title}
                                    </h1>
                                    <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                                        {isOverview
                                            ? "Welcome to the Server Monitoring System documentation. Explore guides, setup instructions, and technical references."
                                            : page?.description}
                                    </p>
                                </div>

                                {/* Article Body */}
                                <div className="mt-8">
                                    {isOverview ? (
                                        <>
                                            <DocsOverviewContent />

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
                                                <DocCard
                                                    title="Getting Started"
                                                    description="Prerequisites, installation, configuration, and running the application."
                                                    icon={Rocket}
                                                    href="#requirements"
                                                    onClick={() =>
                                                        go("requirements")
                                                    }
                                                />
                                                <DocCard
                                                    title="User Guide"
                                                    description="A walkthrough of the app: dashboard, clients, servers, users, logs, reports, and settings."
                                                    icon={Activity}
                                                    href="#dashboard"
                                                    onClick={() => go("dashboard")}
                                                />
                                                <DocCard
                                                    title="Technical Reference"
                                                    description="ADRs, agent flow, credentials storage, architecture, alerting engine, and scheduling."
                                                    icon={Network}
                                                    href="#adrs"
                                                    onClick={() => go("adrs")}
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        page && <page.Content />
                                    )}
                                </div>

                                <DocPager prev={prev} next={next} onGo={go} />
                            </div>

                            {/* Right "On this page" TOC Sidebar (shadcn format) */}
                            {currentSubs.length > 0 && (
                                <div className="hidden xl:block w-64 shrink-0 pl-8">
                                    <div className="sticky top-6 space-y-2">
                                        <p className="text-sm font-semibold text-foreground tracking-tight">
                                            On this page
                                        </p>
                                        <div className="space-y-1 text-sm border-l border-border/50 pl-3">
                                            {currentSubs.map((sub) => (
                                                <button
                                                    key={sub.id}
                                                    type="button"
                                                    onClick={() => jumpToSub(current.id, sub.id)}
                                                    className={cn(
                                                        "block w-full text-left py-1 text-xs transition-colors cursor-pointer leading-normal",
                                                        activeSub === sub.id
                                                            ? "font-medium text-foreground"
                                                            : "text-muted-foreground hover:text-foreground",
                                                    )}
                                                >
                                                    {sub.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>

            {/* Mobile Drawer */}
            <div className="lg:hidden fixed inset-0 z-50 pointer-events-none">
                <div
                    className={cn(
                        "absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300",
                        mobileOpen ? "opacity-100" : "opacity-0",
                        mobileOpen && "pointer-events-auto",
                    )}
                    onClick={() => setMobileOpen(false)}
                />
                <div
                    className={cn(
                        "absolute inset-y-0 right-0 w-72 max-w-[85vw] bg-background border-l border-border/60 shadow-2xl overflow-y-auto py-5 px-4 transition-transform duration-300 ease-in-out",
                        mobileOpen
                            ? "translate-x-0 pointer-events-auto"
                            : "translate-x-full",
                    )}
                >
                    <div className="flex items-center justify-between pb-4 mb-4 border-b border-border/50">
                        <div className="flex items-center gap-2">
                            <BookOpen className="size-4.5 text-foreground" />
                            <span className="text-sm font-semibold">Docs Navigation</span>
                        </div>
                        <button
                            type="button"
                            aria-label="Close docs navigation"
                            onClick={() => setMobileOpen(false)}
                            className="flex size-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                            <X className="size-4" />
                        </button>
                    </div>
                    <DocsNav
                        sections={DOC_SECTIONS}
                        activeId={current.id}
                        onJump={go}
                    />
                </div>
            </div>

            {/* Hidden parser for auto-generating TOC sub-items */}
            <div ref={hiddenRef} className="hidden" aria-hidden="true">
                {DOC_SECTIONS.filter((s) => s.id !== "alerting").map(
                    (section) => {
                        const Content =
                            section.id === "overview"
                                ? DocsOverviewContent
                                : PAGES[section.id].Content;
                        return (
                            <div
                                key={section.id}
                                data-docpage={section.id}
                            >
                                <Content />
                            </div>
                        );
                    },
                )}
            </div>
        </div>
    );
}
