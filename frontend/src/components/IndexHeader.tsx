import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "./ui/breadcrumb";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { toLabelCase } from "@/utils/helpers";

export interface Crumb {
    label: string;
    href?: string;
}

interface IndexHeaderProps {
    icon?: LucideIcon;
    title?: string;
    description?: string;
    trail?: Crumb[];
    trailLoading?: boolean;
}

const IndexHeader: React.FC<IndexHeaderProps> = ({
    icon: Icon,
    title,
    description,
    trail = [],
    trailLoading = false,
}) => {
    if (!Icon && !title && trail.length === 0) {
        return null;
    }

    return (
        <header className="min-w-0 h-10.5">
            <div className="h-full flex gap-4 items-center">
                {Icon && (
                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                    </div>
                )}
                <div className="flex flex-col justify-center min-w-0 flex-1">
                    {trail.length > 0 ? (
                        <Breadcrumb className="min-w-0 max-w-full">
                            <BreadcrumbList className="min-w-0 max-w-full flex-nowrap overflow-hidden items-end">
                                {trail.map((crumb, index) => {
                                    const isLast =
                                        index === trail.length - 1;

                                    return (
                                        <React.Fragment
                                            key={crumb.href || index}
                                        >
                                            <BreadcrumbItem
                                                className={cn(
                                                    "shrink-0",
                                                    isLast &&
                                                        "min-w-0 flex-1",
                                                )}
                                            >
                                                {isLast ? (
                                                    <BreadcrumbPage
                                                        className={cn(
                                                            "block min-w-0 max-w-full truncate text-foreground text-lg font-semibold leading-none tracking-tight",
                                                            trailLoading &&
                                                                "animate-pulse",
                                                        )}
                                                    >
                                                        {trailLoading &&
                                                        !crumb.label
                                                            ? "\u00A0"
                                                            : toLabelCase(
                                                                  crumb.label,
                                                                  true,
                                                              )}
                                                    </BreadcrumbPage>
                                                ) : (
                                                    <BreadcrumbLink asChild>
                                                        <Link
                                                            to={crumb.href!}
                                                            className="text-foreground text-lg font-normal leading-none tracking-tight hover:text-blue-500"
                                                        >
                                                            {toLabelCase(
                                                                crumb.label,
                                                                true,
                                                            )}
                                                        </Link>
                                                    </BreadcrumbLink>
                                                )}
                                            </BreadcrumbItem>

                                            {!isLast && (
                                                <BreadcrumbSeparator className="shrink-0 text-foreground text-lg" />
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </BreadcrumbList>
                        </Breadcrumb>
                    ) : (
                        title && (
                            <span className="block min-w-0 max-w-full truncate text-lg font-semibold leading-none tracking-tight">
                                {title}
                            </span>
                        )
                    )}
                    {description && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                            {description}
                        </p>
                    )}
                </div>
            </div>
        </header>
    );
};

export default IndexHeader;
