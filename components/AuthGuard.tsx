"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const checkUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push("/auth");
                    return;
                }
                setIsLoading(false);
            } catch (error) {
                console.error("Auth check failed:", error);
                router.push("/auth");
            }
        };

        checkUser();
    }, [router, supabase]);

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                        repeat: Infinity,
                        repeatType: "reverse",
                        duration: 1
                    }}
                    className="flex flex-col items-center gap-4"
                >
                    <div className="w-12 h-12 rounded-full border-2 border-rose-500/20 border-t-rose-500 animate-spin" />
                    <p className="text-rose-200/50 text-sm font-medium tracking-wider">验证身份中...</p>
                </motion.div>
            </div>
        );
    }

    return <>{children}</>;
}
