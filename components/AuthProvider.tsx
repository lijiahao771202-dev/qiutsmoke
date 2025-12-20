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
    // 初始化为 true，等 session 检查完成后设为 false
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        let isMounted = true;

        const initAuth = async () => {
            try {
                // 使用 getSession 读取本地 cookie
                const { data: { session } } = await supabase.auth.getSession();
                if (isMounted) {
                    setUser(session?.user ?? null);
                    setLoading(false);
                }
            } catch (error) {
                console.error("Auth initialization failed:", error);
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        initAuth();

        // 监听认证状态变化
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
            if (isMounted) {
                setUser(session?.user ?? null);
                setLoading(false);
            }
        });

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

