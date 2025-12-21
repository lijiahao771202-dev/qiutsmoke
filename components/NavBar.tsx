"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wind, Droplets, Sparkles, BarChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/lib/hooks/useHaptics";

// 带震动反馈的导航链接
function NavLink({ href, children, isActive, className }: {
    href: string;
    children: React.ReactNode;
    isActive: boolean;
    className?: string;
}) {
    const { triggerLight } = useHaptics();

    return (
        <Link
            href={href}
            onClick={() => triggerLight()}
            className={className}
        >
            {children}
        </Link>
    );
}

export default function NavBar() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <nav className="fixed md:top-6 md:bottom-auto bottom-[calc(2rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 glass-panel rounded-full p-2 flex justify-center items-center gap-6 md:gap-4 shadow-2xl shadow-black/40 backdrop-blur-3xl bg-black/20 border border-white/10 ring-1 ring-white/5">
            <NavLink
                href="/"
                isActive={isActive("/")}
                className={cn(
                    "p-4 md:p-3 rounded-full transition-all duration-300 relative group",
                    isActive("/")
                        ? "bg-white/20 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
            >
                <div className={cn(
                    "absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-teal-400 transition-all duration-300",
                    isActive("/") ? "opacity-100 scale-100" : "opacity-0 scale-0"
                )} />
                <Wind className="w-6 h-6" />
                <span className="sr-only">Home</span>
            </NavLink>

            <NavLink
                href="/meditate"
                isActive={isActive("/meditate")}
                className={cn(
                    "p-4 md:p-3 rounded-full transition-all duration-300 relative group",
                    isActive("/meditate")
                        ? "bg-white/20 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
            >
                <div className={cn(
                    "absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400 transition-all duration-300",
                    isActive("/meditate") ? "opacity-100 scale-100" : "opacity-0 scale-0"
                )} />
                <Droplets className="w-6 h-6" />
                <span className="sr-only">Meditate</span>
            </NavLink>

            <NavLink
                href="/tts-studio"
                isActive={isActive("/tts-studio")}
                className={cn(
                    "p-4 md:p-3 rounded-full transition-all duration-300 relative group",
                    isActive("/tts-studio")
                        ? "bg-white/20 text-teal-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]"
                        : "text-slate-400 hover:text-teal-400 hover:bg-white/5"
                )}
            >
                <div className={cn(
                    "absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-purple-400 transition-all duration-300",
                    isActive("/tts-studio") ? "opacity-100 scale-100" : "opacity-0 scale-0"
                )} />
                <Sparkles className="w-6 h-6" />
                <span className="sr-only">TTS Studio</span>
            </NavLink>

            <NavLink
                href="/stats"
                isActive={isActive("/stats")}
                className={cn(
                    "p-4 md:p-3 rounded-full transition-all duration-300 relative group",
                    isActive("/stats")
                        ? "bg-white/20 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)]"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
            >
                <div className={cn(
                    "absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-rose-400 transition-all duration-300",
                    isActive("/stats") ? "opacity-100 scale-100" : "opacity-0 scale-0"
                )} />
                <BarChart className="w-6 h-6" />
                <span className="sr-only">Statistics</span>
            </NavLink>
        </nav>
    );
}
