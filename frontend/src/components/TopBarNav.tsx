import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "./ui/breadcrumb";
import React from "react";
import { twMerge } from "tailwind-merge";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import { toLabelCase } from "@/utils/helpers";

const TopBarNav: React.FC = () => {
    const { trail, isLoading } = useBreadcrumb();

    if (isLoading) {
        return (
            <div className="flex justify-between items-center relative h-16 py-2">
                <div className="flex items-center gap-3 animate-pulse">
                    {trail.map((_, i) => (
                        <React.Fragment key={i}>
                            <div
                                className="h-5 rounded bg-muted-foreground/10"
                                style={{ width: `${i === 0 ? 24 : 36}ch` }}
                            />
                            {i < trail.length - 1 && (
                                <div className="size-4 rounded bg-muted-foreground/10" />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        );
    }

    if (trail.length === 0) {
        return null;
    }

    return (
        <div className="flex justify-between items-center relative h-16 py-2">
            <Breadcrumb>
                <BreadcrumbList className="items-end">
                    {trail.map((crumb, index) => (
                        <React.Fragment key={crumb.href || index}>
                            <BreadcrumbItem>
                                {index === trail.length - 1 ? (
                                    <BreadcrumbPage
                                        className={twMerge(
                                            "text-foreground text-lg leading-3.5",
                                            index === 0 &&
                                                "text-2xl font-bold leading-5",
                                        )}
                                    >
                                        {toLabelCase(crumb.label, true)}
                                    </BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink
                                        href={crumb.href}
                                        className={twMerge(
                                            "text-foreground text-lg leading-3.5 hover:text-blue-500",
                                            index === 0 &&
                                                "text-2xl font-bold leading-5",
                                        )}
                                    >
                                        {toLabelCase(crumb.label, true)}
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
        </div>
    );
};

export default TopBarNav;
