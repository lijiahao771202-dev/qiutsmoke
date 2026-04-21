"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";

interface AuthContextType {
    user: User | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

// ─── localStorage 缓存 ───

const AUTH_CACHE_KEY = 'rain_auth_cache';

function getCachedUser(): User | null {
    if (typeof window === 'undefined') return null;
    try {
        const cached = localStorage.getItem(AUTH_CACHE_KEY);
        if (cached) return JSON.parse(cached);
    } catch {}
    return null;
}

function setCachedUser(user: User | null) {
    if (typeof window === 'undefined') return;
    try {
        if (user) {
            localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(user));
        } else {
            localStorage.removeItem(AUTH_CACHE_KEY);
        }
    } catch {}
}

// ─── Provider ───

export function AuthProvider({ children }: { children: React.ReactNode }) {
    // 🚀 核心优化：用 localStorage 缓存的用户信息初始化
    // 这是同步读取，零延迟！
    const cachedUser = getCachedUser();
    const [user, setUser] = useState<User | null>(cachedUser);
    // 如果有缓存，直接视为"不在加载"，页面秒出
    const [loading, setLoading] = useState(!cachedUser);
    const supabase = createClient();

    useEffect(() => {
        let isMounted = true;

        // 后台静默验证：向 Supabase 确认 session 是否仍然有效
        const validateSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (isMounted) {
                    const freshUser = session?.user ?? null;
                    setUser(freshUser);
                    setLoading(false);
                    // 更新缓存
                    setCachedUser(freshUser);
                }
            } catch (error) {
                console.error("Auth validation failed:", error);
                if (isMounted) setLoading(false);
            }
        };

        validateSession();

        // 监听认证状态变化（登录/登出/token 刷新）
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event: AuthChangeEvent, session: Session | null) => {
                if (isMounted) {
                    const newUser = session?.user ?? null;
                    setUser(newUser);
                    setLoading(false);
                    // 同步更新缓存
                    setCachedUser(newUser);
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
