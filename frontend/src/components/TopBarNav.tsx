import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
} from "./ui/breadcrumb";
import React from "react";
import { twMerge } from "tailwind-merge";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import { toLabelCase } from "@/utils/helpers";

const TopBarNav: React.FC = () => {
    const { trail } = useBreadcrumb();

    if (trail.length === 0) {
        return null;
    }

    return (
        <div className="flex justify-between items-center relative mb-9 py-2">
            <Breadcrumb>
                <BreadcrumbList className="items-end">
                    {trail.map((crumb, index) => (
                        <React.Fragment key={crumb.href || index}>
                            <BreadcrumbItem>
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
