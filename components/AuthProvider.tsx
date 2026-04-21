"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";

interface AuthContextType {
    user: User | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        let isMounted = true;

        // 🚀 优化：给 getSession 加超时保护
        // 如果 Supabase 慢，100ms 后直接视为"无用户"继续渲染
        const SESSION_TIMEOUT = 100;

        const initAuth = async () => {
            try {
                const sessionPromise = supabase.auth.getSession();
                const timeoutPromise = new Promise<null>((resolve) =>
                    setTimeout(() => resolve(null), SESSION_TIMEOUT)
                );

                const result = await Promise.race([sessionPromise, timeoutPromise]);

                if (isMounted) {
                    if (result && 'data' in result) {
                        setUser(result.data.session?.user ?? null);
                    }
                    // 无论超时还是成功，都结束 loading
                    setLoading(false);
                }
            } catch (error) {
                console.error("Auth initialization failed:", error);
                if (isMounted) setLoading(false);
            }
        };

        initAuth();

        // onAuthStateChange 会在 session 恢复后自动触发
        // 即使 getSession 超时了，这里也会后续补上正确的 user
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event: AuthChangeEvent, session: Session | null) => {
                if (isMounted) {
                    setUser(session?.user ?? null);
                    setLoading(false);
                }
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
        };
    }, [supabase]);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
