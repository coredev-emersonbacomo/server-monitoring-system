import type { ReactNode } from "react";

function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function Section({
    title,
    id,
    children,
}: {
    title: string;
    id?: string;
    children: ReactNode;
}) {
    return (
        <section className="mb-10">
            <h2
                id={id ?? slugify(title)}
                className="text-base font-semibold text-foreground mb-3 pb-2 border-b border-border/40 scroll-mt-6"
            >
                {title}
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                {children}
            </div>
        </section>
    );
}

export function SubSection({
    title,
    id,
    children,
}: {
    title: string;
    id?: string;
    children: ReactNode;
}) {
    return (
        <div className="mt-5 mb-2">
            <h3
                id={id ?? slugify(title)}
                className="text-sm font-semibold text-foreground mb-2 scroll-mt-6"
            >
                {title}
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                {children}
            </div>
        </div>
    );
}

export function CodeBlock({ children }: { children: string }) {
    return (
        <pre className="bg-muted/50 border border-border/40 rounded-lg px-4 py-3 text-xs font-mono text-foreground overflow-x-auto whitespace-pre">
            {children}
        </pre>
    );
}

export function InlineCode({ children }: { children: string }) {
    return (
        <code className="bg-muted/50 border border-border/40 rounded px-1.5 py-0.5 text-xs font-mono text-foreground">
            {children}
        </code>
    );
}

export function Callout({
    children,
    type = "info",
}: {
    children: ReactNode;
    type?: "info" | "warning";
}) {
    const styles =
        type === "warning"
            ? "border-amber-500/40 bg-amber-500/5"
            : "border-primary/30 bg-primary/5";
    return (
        <div className={`rounded-lg border px-4 py-3 text-sm ${styles}`}>
            {children}
        </div>
    );
}
