import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface DocCardProps {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    href: string;
    onClick?: () => void;
    thumbnail?: string;
    badge?: ReactNode;
}

export default function DocCard({
    title,
    description,
    icon: Icon,
    href,
    onClick,
    thumbnail,
    badge,
}: DocCardProps) {
    return (
        <Link
            to={href}
            onClick={(e) => {
                if (onClick) {
                    e.preventDefault();
                    onClick();
                }
            }}
            className="group relative flex flex-col justify-between rounded-xl border border-border/60 bg-card p-5 text-card-foreground shadow-sm transition-all hover:border-border hover:shadow-md hover:bg-muted/20 cursor-pointer"
        >
            <div>
                {thumbnail ? (
                    <div className="mb-4 aspect-video overflow-hidden rounded-lg border border-border/40 bg-muted/40">
                        <img
                            src={thumbnail}
                            alt={title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                    </div>
                ) : (
                    <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg border border-border/60 bg-muted/60 text-muted-foreground group-hover:text-primary group-hover:border-primary/40 transition-colors">
                        <Icon className="size-5" />
                    </div>
                )}
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base tracking-tight group-hover:text-primary transition-colors">
                            {title}
                        </h3>
                        {badge}
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed line-clamp-2">
                        {description}
                    </p>
                </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                <span>Explore guide</span>
                <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
        </Link>
    );
}
