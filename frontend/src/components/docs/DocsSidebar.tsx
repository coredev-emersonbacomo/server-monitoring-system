import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DocsSection {
    id: string;
    label: string;
    icon: LucideIcon;
    group?: string;
}

export interface DocSubItem {
    id: string;
    label: string;
    level: number;
}

interface DocsNavProps {
    sections: DocsSection[];
    activeId: string;
    onJump: (id: string) => void;
    subSections?: Record<string, DocSubItem[]>;
    activeSub?: string | null;
    onSubJump?: (sectionId: string, subId: string) => void;
}

export function DocsNav({
    sections,
    activeId,
    onJump,
    subSections = {},
    activeSub,
    onSubJump,
}: DocsNavProps) {
    const groups: { label: string; sections: DocsSection[] }[] = [];
    sections.forEach((section) => {
        const label = section.group ?? "";
        const last = groups[groups.length - 1];
        if (last && last.label === label) {
            last.sections.push(section);
        } else {
            groups.push({ label, sections: [section] });
        }
    });

    return (
        <div className="flex flex-col gap-6">
            {groups.map((group) => (
                <div key={group.label}>
                    {group.label && (
                        <div className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                            {group.label}
                        </div>
                    )}
                    <div className="flex flex-col gap-1">
                        {group.sections.map((section) => {
                            const isActive = activeId === section.id;
                            const subs = subSections[section.id] ?? [];
                            return (
                                <div key={section.id}>
                                    <button
                                        onClick={() => onJump(section.id)}
                                        className={cn(
                                            "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 pr-8 text-left text-sm transition cursor-pointer",
                                            isActive
                                                ? "bg-sidebar-active font-medium"
                                                : "text-muted-foreground hover:bg-sidebar-hover",
                                        )}
                                    >
                                        <section.icon className="size-4 shrink-0" />
                                        <span className="truncate">
                                            {section.label}
                                        </span>
                                    </button>
                                    {subs.length > 0 && (
                                        <div className="mt-0.5 flex flex-col gap-0.5">
                                            {subs.map((sub) => (
                                                <button
                                                    key={sub.id}
                                                    onClick={() =>
                                                        onSubJump?.(
                                                            section.id,
                                                            sub.id,
                                                        )
                                                    }
                                                    style={{
                                                        paddingLeft: `${
                                                            36 +
                                                            (sub.level - 1) *
                                                                12
                                                        }px`,
                                                    }}
                                                    className={cn(
                                                        "block w-full truncate text-left py-1 pr-2 text-[13px] rounded-lg transition cursor-pointer",
                                                        activeSub === sub.id
                                                            ? "text-foreground font-medium"
                                                            : "text-muted-foreground hover:text-foreground hover:bg-sidebar-hover",
                                                    )}
                                                >
                                                    {sub.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

export function DocsSidebar(props: DocsNavProps) {
    return (
        <aside className="h-full min-h-0 overflow-y-auto">
            <div className="py-6 pl-4 pr-3 pb-10">
                <DocsNav
                    sections={props.sections}
                    activeId={props.activeId}
                    onJump={props.onJump}
                    subSections={props.subSections}
                    activeSub={props.activeSub}
                    onSubJump={props.onSubJump}
                />
            </div>
        </aside>
    );
}
