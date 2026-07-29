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
        <header className="shrink-0 h-[42px]">
            <div className="h-full flex gap-4 items-center">
                {Icon && (
                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                        <Icon className="w-5 h-5 text-primary" />
                    </div>
                )}
                <div className="flex flex-col justify-center">
                    {trail.length > 0 ? (
                        <Breadcrumb>
                            <BreadcrumbList className="items-end">
                                {trail.map((crumb, index) => (
                                    <React.Fragment
                                        key={crumb.href || index}
                                    >
                                        <BreadcrumbItem>
                                            {index === trail.length - 1 ? (
                                                <BreadcrumbPage
                                                    className={cn(
                                                        "text-foreground text-lg font-semibold leading-none tracking-tight",
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
                                                <BreadcrumbLink
                                                    href={crumb.href}
                                                    className="text-foreground text-lg font-normal leading-none tracking-tight hover:text-blue-500"
                                                >
                                                    {toLabelCase(
                                                        crumb.label,
                                                        true,
                                                    )}
                                                </BreadcrumbLink>
                                            )}
                                        </BreadcrumbItem>
                                        {index !== trail.length - 1 && (
                                            <BreadcrumbSeparator className="text-foreground text-lg" />
                                        )}
                                    </React.Fragment>
                                ))}
                            </BreadcrumbList>
                        </Breadcrumb>
                    ) : (
                        title && (
                            <span className="text-lg font-semibold leading-none tracking-tight">
                                {title}
                            </span>
                        )
                    )}
                    {description && (
                        <p className="text-sm text-muted-foreground mt-1">
                            {description}
                        </p>
                    )}
                </div>
            </div>
        </header>
    );
};

export default IndexHeader;
