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
            className="group flex flex-col bg-card border border-border/40 rounded-xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 overflow-hidden cursor-pointer"
        >
            {thumbnail ? (
                <div className="h-36 overflow-hidden bg-muted/30">
                    <img
                        src={thumbnail}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                </div>
            ) : (
                <div className="h-36 flex items-center justify-center bg-muted/20 border-b border-border/30">
                    <Icon className="w-10 h-10 text-muted-foreground/40" />
                </div>
            )}
            <div className="p-4 flex items-center justify-between">
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                        <p className="font-medium text-sm group-hover:text-primary transition-colors">
                            {title}
                        </p>
                        {badge}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        {description}
                    </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </div>
        </Link>
    );
}
