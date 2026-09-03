import { useEffect, useRef, useState, type ReactNode } from "react";
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DemoPlayerProps {
    steps: ReactNode[];
    interval?: number;
    className?: string;
}

export function DemoPlayer({
    steps,
    interval = 1800,
    className,
}: DemoPlayerProps) {
    const [index, setIndex] = useState(0);
    const [playing, setPlaying] = useState(true);
    const frameRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = frameRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => setPlaying(entry.isIntersecting),
            { threshold: 0.3 },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!playing) return;
        const timer = setInterval(
            () => setIndex((i) => (i + 1) % steps.length),
            interval,
        );
        return () => clearInterval(timer);
    }, [playing, interval, steps.length]);

    return (
        <div
            ref={frameRef}
            className={cn(
                "rounded-xl border border-border/60 bg-muted/20 p-4",
                className,
            )}
        >
            <div className="pointer-events-none select-none">
                {steps[index % steps.length]}
            </div>
            <div className="mt-3 flex items-center justify-center gap-2">
                <button
                    type="button"
                    aria-label="Previous step"
                    onClick={() =>
                        setIndex((i) => (i + steps.length - 1) % steps.length)
                    }
                    className="p-1 rounded-md text-muted-foreground hover:bg-sidebar-hover transition cursor-pointer"
                >
                    <ChevronLeft className="size-4" />
                </button>
                <button
                    type="button"
                    aria-label={playing ? "Pause" : "Play"}
                    onClick={() => setPlaying((p) => !p)}
                    className="p-1 rounded-md text-muted-foreground hover:bg-sidebar-hover transition cursor-pointer"
                >
                    {playing ? (
                        <Pause className="size-4" />
                    ) : (
                        <Play className="size-4" />
                    )}
                </button>
                <button
                    type="button"
                    aria-label="Next step"
                    onClick={() => setIndex((i) => (i + 1) % steps.length)}
                    className="p-1 rounded-md text-muted-foreground hover:bg-sidebar-hover transition cursor-pointer"
                >
                    <ChevronRight className="size-4" />
                </button>
                <span className="ml-2 text-[11px] text-muted-foreground tabular-nums">
                    {(index % steps.length) + 1} / {steps.length}
                </span>
            </div>
        </div>
    );
}