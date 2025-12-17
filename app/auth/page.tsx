
"use client";

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createClient } from '@/lib/supabase/client';
import { motion } from 'framer-motion';

export default function AuthPage() {
    const supabase = createClient();

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-black text-white">
            {/* Background Ambience (Simplified version of layout) */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-rose-500/20 rounded-full blur-[120px] animate-pulse mix-blend-screen" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-indigo-500/20 rounded-full blur-[100px] animate-pulse mix-blend-screen" style={{ animationDelay: "2s" }} />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 w-full max-w-md p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-3xl shadow-2xl"
            >
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold tracking-tight text-white/90">欢迎回来</h1>
                    <p className="text-white/50 text-sm mt-2">QuitSmoke · 冥想与语音工坊</p>
                </div>

                <Auth
                    supabaseClient={supabase}
                    appearance={{
                        theme: ThemeSupa,
                        variables: {
                            default: {
                                colors: {
                                    brand: '#f43f5e', // rose-500
                                    brandAccent: '#fb7185', // rose-400
                                    inputText: 'white',
                                    inputBackground: 'rgba(255,255,255,0.05)',
                                    inputBorder: 'rgba(255,255,255,0.1)',
                                    inputPlaceholder: 'rgba(255,255,255,0.3)',
                                }
                            }
                        },
                        className: {
                            button: 'rounded-xl',
                            input: 'rounded-xl',
                            container: 'gap-4',
                            label: 'text-white/60 text-xs uppercase tracking-wider',
                        }
                    }}
                    providers={[]} // Only Email for now as requested
                    localization={{
                        variables: {
                            sign_in: {
                                email_label: '邮箱',
                                password_label: '密码',
                                button_label: '登录',
                                loading_button_label: '登录中...',
                                link_text: '已有账号？登录',
                            },
                            sign_up: {
                                email_label: '邮箱',
                                password_label: '密码',
                                button_label: '注册',
                                loading_button_label: '注册中...',
                                link_text: '没有账号？注册',
                            },
                            forgotten_password: {
                                link_text: '忘记密码？',
                            }
                        }
                    }}
                />
            </motion.div>
        </div>
    );
}
