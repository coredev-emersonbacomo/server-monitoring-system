import { useState, useEffect, type ReactNode } from "react";
import {
    Check,
    Copy,
    Info,
    AlertTriangle,
    AlertCircle,
    Lightbulb,
    Maximize2,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    className,
}: {
    title: string;
    id?: string;
    children: ReactNode;
    className?: string;
}) {
    const headingId = id ?? slugify(title);
    return (
        <section className={cn("mt-10 scroll-m-20 first:mt-0", className)}>
            <h2
                id={headingId}
                className="group flex items-center gap-2 border-b border-border/60 pb-2 text-2xl font-semibold tracking-tight text-foreground first:mt-0"
            >
                <a
                    href={`#${headingId}`}
                    className="hover:underline underline-offset-4 decoration-border/80"
                >
                    {title}
                </a>
            </h2>
            <div className="mt-4 space-y-4 text-[15px] leading-7 text-muted-foreground">
                {children}
            </div>
        </section>
    );
}

export function SubSection({
    title,
    id,
    children,
    className,
}: {
    title: string;
    id?: string;
    children: ReactNode;
    className?: string;
}) {
    const headingId = id ?? slugify(title);
    return (
        <div className={cn("mt-8 scroll-m-20", className)}>
            <h3
                id={headingId}
                className="text-lg font-semibold tracking-tight text-foreground mb-3"
            >
                {title}
            </h3>
            <div className="space-y-3 text-[15px] leading-7 text-muted-foreground">
                {children}
            </div>
        </div>
    );
}

export function CodeBlock({
    children,
    language,
    filename,
}: {
    children: string;
    language?: string;
    filename?: string;
}) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(children.trim());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback
        }
    };

    return (
        <div className="group relative my-5 overflow-hidden rounded-xl border border-border/60 bg-zinc-950/90 dark:bg-zinc-950 shadow-sm">
            {filename && (
                <div className="flex items-center justify-between border-b border-border/40 bg-muted/20 px-4 py-2 text-xs font-mono text-muted-foreground">
                    <span>{filename}</span>
                    {language && <span className="uppercase text-[10px] tracking-wider opacity-70">{language}</span>}
                </div>
            )}
            <div className="relative">
                <button
                    type="button"
                    onClick={handleCopy}
                    aria-label="Copy code"
                    className="absolute right-3 top-3 z-10 flex size-7 items-center justify-center rounded-md border border-border/40 bg-zinc-900/80 text-zinc-400 opacity-0 backdrop-blur transition hover:bg-zinc-800 hover:text-zinc-100 group-hover:opacity-100 cursor-pointer"
                >
                    {copied ? (
                        <Check className="size-3.5 text-emerald-400" />
                    ) : (
                        <Copy className="size-3.5" />
                    )}
                </button>
                <pre className="overflow-x-auto p-4 text-xs md:text-[13px] font-mono leading-relaxed text-zinc-100 whitespace-pre">
                    <code>{children}</code>
                </pre>
            </div>
        </div>
    );
}

export function InlineCode({ children }: { children: string }) {
    return (
        <code className="relative rounded-md bg-muted/80 px-[0.35rem] py-[0.15rem] font-mono text-xs md:text-[13px] font-medium text-foreground border border-border/50 break-words">
            {children}
        </code>
    );
}

export function Callout({
    children,
    type = "info",
    title,
}: {
    children: ReactNode;
    type?: "info" | "warning" | "danger" | "tip";
    title?: string;
}) {
    const config = {
        info: {
            border: "border-blue-500/30 dark:border-blue-500/20",
            bg: "bg-blue-500/5 dark:bg-blue-500/10",
            text: "text-blue-600 dark:text-blue-400",
            icon: Info,
            defaultTitle: "Note",
        },
        warning: {
            border: "border-amber-500/40 dark:border-amber-500/20",
            bg: "bg-amber-500/5 dark:bg-amber-500/10",
            text: "text-amber-600 dark:text-amber-400",
            icon: AlertTriangle,
            defaultTitle: "Warning",
        },
        danger: {
            border: "border-destructive/40 dark:border-destructive/20",
            bg: "bg-destructive/5 dark:bg-destructive/10",
            text: "text-destructive dark:text-red-400",
            icon: AlertCircle,
            defaultTitle: "Caution",
        },
        tip: {
            border: "border-emerald-500/40 dark:border-emerald-500/20",
            bg: "bg-emerald-500/5 dark:bg-emerald-500/10",
            text: "text-emerald-600 dark:text-emerald-400",
            icon: Lightbulb,
            defaultTitle: "Tip",
        },
    }[type];

    const Icon = config.icon;

    return (
        <div
            className={cn(
                "my-6 flex items-start gap-3.5 rounded-xl border p-4 text-sm leading-relaxed shadow-sm",
                config.border,
                config.bg
            )}
        >
            <Icon className={cn("size-4.5 shrink-0 mt-0.5", config.text)} />
            <div className="flex-1 min-w-0 space-y-1">
                <p className={cn("font-semibold leading-none tracking-tight", config.text)}>
                    {title || config.defaultTitle}
                </p>
                <div className="text-muted-foreground text-sm leading-relaxed pt-1">
                    {children}
                </div>
            </div>
        </div>
    );
}

export function DocImage({
    src,
    alt,
    caption,
    className,
}: {
    src: string;
    alt: string;
    caption?: string;
    className?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen]);

    return (
        <>
            <div
                onClick={() => setIsOpen(true)}
                className={cn(
                    "group relative my-4 overflow-hidden rounded-lg border border-border/60 bg-muted/20 shadow-sm cursor-zoom-in transition-all hover:border-primary/50 hover:shadow-md",
                    className,
                )}
            >
                <img
                    src={src}
                    alt={alt}
                    className="w-full object-cover rounded-lg transition-transform duration-300 group-hover:scale-[1.01]"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/25 flex items-center justify-center pointer-events-none">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg border border-white/10">
                        <Maximize2 className="size-3.5" />
                        Click to enlarge
                    </span>
                </div>
            </div>

            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 animate-in fade-in-0 duration-200"
                    onClick={() => setIsOpen(false)}
                >
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        aria-label="Close image preview"
                        className="absolute top-4 right-4 sm:top-6 sm:right-6 flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer backdrop-blur-sm z-50"
                    >
                        <X className="size-5" />
                    </button>

                    <div
                        className="relative flex flex-col items-center justify-center max-w-[85vw] max-h-[85vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={src}
                            alt={alt}
                            className="w-[75vw] max-w-7xl max-h-[80vh] object-contain rounded-xl drop-shadow-2xl"
                        />
                        {(caption || alt) && (
                            <p className="mt-3 text-center text-sm text-white/90 font-medium max-w-3xl drop-shadow">
                                {caption || alt}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}

export function DocMedia({
    src,
    alt,
    caption,
}: {
    src: string;
    alt: string;
    caption?: string;
}) {
    return (
        <figure className="my-6">
            <DocImage src={src} alt={alt} caption={caption} />
            {caption && (
                <figcaption className="mt-1 text-center text-xs text-muted-foreground">
                    {caption}
                </figcaption>
            )}
        </figure>
    );
}
