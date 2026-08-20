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
}

export function DocsNav({
    sections,
    activeId,
    onJump,
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
        <div className="w-full space-y-6">
            {groups.map((group) => (
                <div key={group.label} className="space-y-1">
                    {group.label && (
                        <h4 className="px-2 pb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                            {group.label}
                        </h4>
                    )}
                    <div className="space-y-1">
                        {group.sections.map((section) => {
                            const isActive = activeId === section.id;
                            return (
                                <button
                                    key={section.id}
                                    type="button"
                                    onClick={() => onJump(section.id)}
                                    className={cn(
                                        "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm font-medium transition-colors cursor-pointer",
                                        isActive
                                            ? "bg-accent text-accent-foreground font-semibold"
                                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                                    )}
                                >
                                    <section.icon
                                        className={cn(
                                            "size-4 shrink-0 transition-colors",
                                            isActive
                                                ? "text-foreground"
                                                : "text-muted-foreground/70 group-hover:text-foreground",
                                        )}
                                    />
                                    <span className="truncate">
                                        {section.label}
                                    </span>
                                </button>
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
            <div className="py-6 px-4 pb-12">
                <DocsNav
                    sections={props.sections}
                    activeId={props.activeId}
                    onJump={props.onJump}
                />
            </div>
        </aside>
    );
}
