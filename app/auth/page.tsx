'use client';

import { Suspense, useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createBrowserClient } from '@supabase/ssr';
import { motion } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

function AuthContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const next = searchParams.get('next') || '/';

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 监听认证状态变化，登录成功后自动跳转
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('[Auth] State changed:', event, session?.user?.email);

            if (event === 'SIGNED_IN' && session) {
                // 登录成功，自动跳转到目标页面
                console.log('[Auth] Signed in! Redirecting to:', next);

                // 使用 setTimeout 确保状态更新完成
                setTimeout(() => {
                    router.replace(next);
                }, 100);
            }
        });

        // 检查是否已登录
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                console.log('[Auth] Already signed in, redirecting to:', next);
                router.replace(next);
            }
        };
        checkSession();

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase, router, next]);

    // Convert relative URL to absolute URL for OAuth redirection
    const getRedirectUrl = () => {
        if (typeof window === 'undefined') return undefined;
        const origin = window.location.origin;
        const cleanNext = next.startsWith('/') ? next : `/${next}`;
        return `${origin}/auth/callback?next=${encodeURIComponent(cleanNext)}`;
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-black text-white selection:bg-rose-500/30">
            {/* Ambient Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-rose-500/10 rounded-full blur-[120px] animate-pulse-slow delay-1000" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative z-10 w-full max-w-md"
            >
                <div className="mb-8 text-center space-y-2">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] mb-4"
                    >
                        <Sparkles className="w-6 h-6 text-indigo-400" />
                    </motion.div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
                        欢迎回来
                    </h1>
                    <p className="text-zinc-400">登入您的 Rain 账户以同步数据</p>
                </div>

                <div className="space-y-4">
                    <div className="backdrop-blur-xl bg-black/40 border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] rounded-3xl p-8 overflow-hidden relative group">
                        <div className="absoulte inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                        <Auth
                            supabaseClient={supabase}
                            appearance={{
                                theme: ThemeSupa,
                                variables: {
                                    default: {
                                        colors: {
                                            brand: 'rgb(99 102 241)',
                                            brandAccent: 'rgb(67 56 202)',
                                            brandButtonText: 'white',
                                            defaultButtonBackground: 'rgba(255,255,255,0.05)',
                                            defaultButtonBackgroundHover: 'rgba(255,255,255,0.1)',
                                            inputBackground: 'rgba(0,0,0,0.3)',
                                            inputBorder: 'rgba(255,255,255,0.1)',
                                            inputBorderHover: 'rgba(255,255,255,0.2)',
                                            inputPlaceholder: 'rgba(255,255,255,0.3)',
                                            inputText: 'white',
                                        },
                                        radii: {
                                            borderRadiusButton: '12px',
                                            borderRadiusInput: '12px',
                                        },
                                        space: {
                                            inputPadding: '12px 16px',
                                            buttonPadding: '12px 16px',
                                        }
                                    },
                                },
                                className: {
                                    button: 'font-medium transition-all duration-200 active:scale-95 shadow-lg shadow-indigo-500/20',
                                    input: 'transition-all duration-200 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 !bg-white/5 backdrop-blur-md',
                                    label: 'text-zinc-400 text-sm font-medium mb-1.5 block',
                                    anchor: 'text-zinc-400 hover:text-white transition-colors text-sm',
                                }
                            }}
                            theme="dark"
                            providers={[]}
                            redirectTo={getRedirectUrl()}
                            localization={{
                                variables: {
                                    sign_in: {
                                        email_label: '邮箱地址',
                                        password_label: '密码',
                                        button_label: '登入',
                                        loading_button_label: '验证中...',
                                    },
                                    sign_up: {
                                        email_label: '邮箱地址',
                                        password_label: '密码',
                                        button_label: '注册账户',
                                        loading_button_label: '创建中...',
                                    },
                                },
                            }}
                        />
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// 加载中状态
function AuthLoading() {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-4"
            >
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                <p className="text-white/40 text-sm">正在检查登录状态...</p>
            </motion.div>
        </div>
    );
}

export default function AuthPage() {
    return (
        <Suspense fallback={<AuthLoading />}>
            <AuthContent />
        </Suspense>
    );
}
