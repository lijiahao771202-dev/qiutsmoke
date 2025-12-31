"use client";

import { cn } from "@/lib/utils";

export const BentoGrid = ({
    className,
    children,
}: {
    className?: string;
    children?: React.ReactNode;
}) => {
    return (
        <div
            className={cn(
                "grid md:auto-rows-[20rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto",
                className
            )}
        >
            {children}
        </div>
    );
};

export const BentoGridItem = ({
    className,
    children,
    header,
    span = 1,
}: {
    className?: string;
    children?: React.ReactNode;
    header?: React.ReactNode;
    span?: 1 | 2 | 3; // How many columns to span
}) => {
    return (
        <div
            className={cn(
                "row-span-1 rounded-3xl group/bento hover:shadow-xl transition duration-200 shadow-input dark:shadow-none p-4 dark:bg-black dark:border-white/[0.2] bg-white border border-transparent justify-between flex flex-col space-y-4",
                span === 2 ? "md:col-span-2" : "md:col-span-1",
                span === 3 ? "md:col-span-3" : "",
                className
            )}
        >
            {header}
            <div className="group-hover/bento:translate-x-2 transition duration-200">
                {children}
            </div>
        </div>
    );
};
