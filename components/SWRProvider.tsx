"use client";

import { SWRConfig } from "swr";
import { ReactNode } from "react";

interface SWRProviderProps {
    children: ReactNode;
}

export function SWRProvider({ children }: SWRProviderProps) {
    return (
        <SWRConfig
            value={{
                revalidateOnFocus: false,
                revalidateIfStale: true,
                dedupingInterval: 5000,
                errorRetryCount: 2,
            }}
        >
            {children}
        </SWRConfig>
    );
}
