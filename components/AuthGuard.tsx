"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !user) {
            router.push(`/auth?next=${encodeURIComponent(pathname)}`);
        }
    }, [user, loading, router, pathname]);

    if (loading) {
        // 🚀 核心优化：loading 期间返回空片段而不是全屏遮罩
        // 这样页面不会被 backdrop-blur 阻塞视觉
        // SSR 时也会返回 null 防止 document 错误
        return null;
    }

    if (!user) {
        return null;
    }

    return <>{children}</>;
}
