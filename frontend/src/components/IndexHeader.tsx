import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import React from "react";

interface IndexHeaderProps {
    icon: LucideIcon;
    title: string;
    description?: string;
}

const IndexHeader: React.FC<IndexHeaderProps> = ({
    icon: Icon,
    title,
    description,
}) => {
    return (
        <header>
            <div>
                <div className="flex items-start justify-between gap-4">
                    <div
                        className={cn(
                            "flex gap-3",
                            description ? "items-start" : "items-center",
                        )}
                    >
                        <div className="p-2 bg-primary/10 rounded-lg mt-0.5">
                            <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <span className="text-lg font-semibold leading-none tracking-tight">
                                {title}
                            </span>
                            {description && (
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default IndexHeader;
