import { cn } from "@/lib/utils";
import { ChevronLeft, type LucideIcon } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";

interface IndexHeaderProps {
    icon: LucideIcon;
    title: string;
    description?: string;
    onBackClick?: () => void;
}

const IndexHeader: React.FC<IndexHeaderProps> = ({
    icon: Icon,
    title,
    description,
    onBackClick,
}) => {
    const navigate = useNavigate();
    return (
        <header>
            <div>
                <div className="flex gap-4">
                    {onBackClick && (
                        <button
                            onClick={() => navigate("/docs")}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    )}
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
