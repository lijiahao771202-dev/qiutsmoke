'use client';

import { Suspense, useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createBrowserClient } from '@supabase/ssr';
import { motion } from 'framer-motion';
import { Droplets, Loader2 } from 'lucide-react';
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
        let redirected = false;

        const handleRedirect = (targetPath: string) => {
            if (redirected) return;
            redirected = true;
            console.log('[Auth] Redirecting to:', targetPath);
            // 使用 window.location 确保完全刷新页面状态
            window.location.href = targetPath;
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('[Auth] State changed:', event, session?.user?.email);

            if (event === 'SIGNED_IN' && session) {
                // 登录成功，自动跳转到目标页面
                handleRedirect(next);
            }
        });

        // 检查是否已登录
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                console.log('[Auth] Already signed in, redirecting to:', next);
                handleRedirect(next);
            }
        };
        checkSession();

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase, next]);

    // Convert relative URL to absolute URL for OAuth redirection
    const getRedirectUrl = () => {
        if (typeof window === 'undefined') return undefined;
        const origin = window.location.origin;
        const cleanNext = next.startsWith('/') ? next : `/${next}`;
        return `${origin}/auth/callback?next=${encodeURIComponent(cleanNext)}`;
    };

    return (
        <div 
            className="fixed inset-0 w-full h-full bg-[#000000] text-white selection:bg-[#B89052]/30 z-[1000] overflow-hidden font-sans"
            style={{ WebkitOverflowScrolling: 'none', overscrollBehavior: 'none' }}
        >
            
            {/* Extremely subtle ambient light - almost invisible */}
            <div className="absolute top-0 left-0 right-0 h-[40vh] bg-gradient-to-b from-[#B89052]/[0.02] to-transparent pointer-events-none" />

            {/* Main Auth Container - Fixed near top to avoid keyboard jank */}
            <div className="absolute top-[12vh] left-0 right-0 w-full max-w-[320px] mx-auto px-4 flex flex-col items-center">
                
                {/* Minimalist Premium Logo Sequence */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="flex flex-col items-center mb-12 w-full"
                >
                    <div className="w-12 h-12 mb-6 flex items-center justify-center">
                        <Droplets strokeWidth={1} className="w-10 h-10 text-[#B89052]" />
                    </div>
                    
                    <h1 className="text-[28px] font-normal tracking-[0.15em] ml-2 text-white mb-2">
                        RAIN
                    </h1>
                    
                    <p className="text-[#666666] text-[13px] font-light tracking-widest">
                        Mindful Surfing
                    </p>
                </motion.div>

                {/* Authentication Form */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                    className="w-full"
                >
                    <Auth
                        supabaseClient={supabase}
                        appearance={{
                            theme: ThemeSupa,
                            variables: {
                                default: {
                                    colors: {
                                        brand: '#B89052',
                                        brandAccent: '#C99F5E',
                                        brandButtonText: '#000000',
                                        defaultButtonBackground: '#111111',
                                        defaultButtonBackgroundHover: '#1A1A1A',
                                        inputBackground: '#111111',
                                        inputBorder: '#222222',
                                        inputBorderHover: '#333333',
                                        inputBorderFocus: '#B89052',
                                        inputPlaceholder: '#666666',
                                        inputText: '#FFFFFF',
                                        messageText: '#B89052',
                                        anchorTextColor: '#888888',
                                        anchorTextHoverColor: '#FFFFFF',
                                    },
                                    radii: {
                                        borderRadiusButton: '16px',
                                        borderRadiusInput: '16px',
                                    },
                                    space: {
                                        inputPadding: '16px 20px',
                                        buttonPadding: '16px 20px',
                                        labelBottomMargin: '8px',
                                    },
                                    fonts: {
                                        bodyFontFamily: 'inherit',
                                        buttonFontFamily: 'inherit',
                                        inputFontFamily: 'inherit',
                                        labelFontFamily: 'inherit',
                                    }
                                },
                            },
                            className: {
                                button: 'w-full h-[52px] bg-[#B89052] hover:bg-[#C99F5E] !text-[#000000] font-medium text-[16px] transition-all duration-300 mt-6 active:scale-[0.98] !border-0 shadow-[0_4px_14px_rgba(184,144,82,0.15)]',
                                input: 'w-full h-[52px] !bg-[#111111] border-[0.5px] !border-[#222222] focus:!border-[#B89052]/50 text-white font-normal text-[16px] transition-colors focus:ring-0 placeholder:text-[#666666] shadow-none',
                                label: 'hidden',
                                anchor: 'text-[#888888] hover:text-[#FFFFFF] text-[13px] font-light transition-colors block text-center mt-2',
                                container: 'space-y-4',
                                message: 'text-[#B89052] text-[13px] font-normal text-center mt-6',
                                divider: 'hidden',
                            }
                        }}
                        theme="dark"
                        providers={[]}
                        redirectTo={getRedirectUrl()}
                        localization={{
                            variables: {
                                sign_in: {
                                    email_label: '',
                                    password_label: '',
                                    button_label: '登 录',
                                    loading_button_label: '登录中...',
                                    email_input_placeholder: '输入您的邮箱',
                                    password_input_placeholder: '输入您的密码',
                                    link_text: '已有账号？点击登录',
                                },
                                sign_up: {
                                    email_label: '',
                                    password_label: '',
                                    button_label: '注 册',
                                    loading_button_label: '注册中...',
                                    email_input_placeholder: '输入您的邮箱',
                                    password_input_placeholder: '设置您的密码',
                                    link_text: '没有账号？点击注册',
                                },
                                forgotten_password: {
                                    link_text: '找回密码',
                                }
                            },
                        }}
                    />
                </motion.div>
                
            </div>
        </div>
    );
}

// 加载中状态
function AuthLoading() {
    return (
        <div className="min-h-screen bg-[#030305] flex items-center justify-center">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-4"
            >
                <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
                <p className="text-white/30 text-xs tracking-widest uppercase font-light">系统初始化中...</p>
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
