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
import PageLayout from "@/components/PageLayout";
import { cn } from "@/lib/utils";
import IndexHeader from "@/components/IndexHeader";
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

// Manual sub-items override the auto-collected ones per page. The
// auto-collector only picks top-level headers; pages that embed heavy live
// components (alerting) get an explicit list instead.
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

function DocSectionHeader({
    icon: Icon,
    title,
    description,
}: {
    icon: LucideIcon;
    title: string;
    description: string;
}) {
    return (
        <div className="flex gap-4 items-center mb-6">
            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex flex-col justify-center">
                <h2 className="text-lg font-semibold leading-none tracking-tight">
                    {title}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    {description}
                </p>
            </div>
        </div>
    );
}

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
        <div className="flex justify-between gap-4 mt-12 border-t border-border/40 pt-8">
            <div className="flex-1">
                {prev && (
                    <button
                        onClick={() => onGo(prev.id)}
                        className="group flex w-full flex-col items-start gap-1 rounded-xl border border-border/40 px-4 py-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
                    >
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <ChevronLeft className="size-3.5 transition group-hover:-translate-x-0.5" />
                            Previous Page
                        </span>
                        <span className="text-sm font-medium">
                            {prev.label}
                        </span>
                    </button>
                )}
            </div>
            <div className="flex-1">
                {next && (
                    <button
                        onClick={() => onGo(next.id)}
                        className="group flex w-full flex-col items-end gap-1 rounded-xl border border-border/40 px-4 py-3 text-right transition hover:border-primary/40 hover:bg-primary/5"
                    >
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            Next Page
                            <ChevronRight className="size-3.5 transition group-hover:translate-x-0.5" />
                        </span>
                        <span className="text-sm font-medium">
                            {next.label}
                        </span>
                    </button>
                )}
            </div>
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
        const offset = 40;
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

    return (
        <div className="flex h-full flex-col w-full">
            <header className="shrink-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur">
                <div className="flex items-center gap-3 px-4 sm:px-6 py-3">
                    <IndexHeader
                        icon={BookOpen}
                        title="Docs"
                        description="System documentation and reference guides."
                    />
                    <button
                        type="button"
                        aria-label="Toggle docs navigation"
                        onClick={() => setMobileOpen((v) => !v)}
                        className="lg:hidden p-2 -mr-2 ml-auto rounded-lg text-muted-foreground hover:bg-sidebar-hover transition cursor-pointer"
                    >
                        <Menu className="size-5" />
                    </button>
                </div>
            </header>

            <ResizablePanelGroup
                defaultLayout={loadDocsLayout()}
                onLayoutChanged={(layout) =>
                    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout))
                }
                className="flex-1 min-h-0 w-full"
            >
                <ResizablePanel
                    id="docs-sidebar"
                    minSize="12"
                    maxSize="30"
                    className="hidden lg:block"
                >
                    <DocsSidebar
                        sections={DOC_SECTIONS}
                        activeId={current.id}
                        onJump={go}
                        subSections={subSections}
                        activeSub={activeSub}
                        onSubJump={jumpToSub}
                    />
                </ResizablePanel>
                <ResizableHandle withHandle className="hidden lg:flex" />
                <ResizablePanel id="docs-content" minSize="40">
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
                        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
                        <PageLayout>
                            {isOverview ? (
                                <>
                                    <DocSectionHeader
                                        icon={BookOpen}
                                        title="Overview"
                                        description="What the system is and how this documentation is organized."
                                    />
                                    <DocsOverviewContent />

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
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
                                            description="ADRs, agent flow, credentials storage, architecture, the alerting engine, and scheduling."
                                            icon={Network}
                                            href="#adrs"
                                            onClick={() => go("adrs")}
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <DocSectionHeader
                                        icon={current.icon}
                                        title={page.title}
                                        description={page.description}
                                    />
                                    <page.Content />
                                </>
                            )}

                            <DocPager prev={prev} next={next} onGo={go} />
                        </PageLayout>
                    </div>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>

            <div className="lg:hidden fixed inset-0 z-50 pointer-events-none">
                <div
                    className={cn(
                        "absolute inset-0 bg-black/50 transition-opacity duration-300",
                        mobileOpen ? "opacity-100" : "opacity-0",
                        mobileOpen && "pointer-events-auto",
                    )}
                    onClick={() => setMobileOpen(false)}
                />
                <div
                    className={cn(
                        "absolute inset-y-0 right-0 w-72 max-w-[85vw] bg-background border-l border-border/40 shadow-xl overflow-y-auto py-4 px-3 transition-transform duration-300 ease-in-out",
                        mobileOpen
                            ? "translate-x-0 pointer-events-auto"
                            : "translate-x-full",
                    )}
                >
                    <div className="flex items-center justify-between px-3 mb-4">
                        <span className="text-sm font-semibold">Docs</span>
                        <button
                            type="button"
                            aria-label="Close docs navigation"
                            onClick={() => setMobileOpen(false)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-sidebar-hover transition cursor-pointer"
                        >
                            <X className="size-5" />
                        </button>
                    </div>
                    <DocsNav
                        sections={DOC_SECTIONS}
                        activeId={current.id}
                        onJump={go}
                        subSections={subSections}
                        activeSub={activeSub}
                        onSubJump={jumpToSub}
                    />
                </div>
            </div>

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
