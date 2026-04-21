"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wind, Droplets, Sparkles, BarChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHaptics } from "@/lib/hooks/useHaptics";
import { motion } from "framer-motion";

export default function NavBar() {
    const pathname = usePathname();
    const { triggerLight } = useHaptics();

    const tabs = [
        { href: "/", icon: Wind, label: "Home" },
        { href: "/meditate", icon: Droplets, label: "Meditate" },
        { href: "/tts-studio", icon: Sparkles, label: "TTS Studio" },
        { href: "/stats", icon: BarChart, label: "Statistics" },
    ];

    return (
        <nav className="fixed md:top-8 md:bottom-auto bottom-[env(safe-area-inset-bottom)] left-1/2 -translate-x-1/2 z-50 rounded-[2.5rem] p-1.5 flex justify-center items-center gap-1 backdrop-blur-[60px] backdrop-saturate-[1.8] bg-white/[0.08] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
            {tabs.map((tab) => {
                const isActive = pathname === tab.href;
                const Icon = tab.icon;

                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        prefetch={true}
                        onClick={() => triggerLight()}
                        className={cn(
                            "relative px-7 py-4 md:px-8 md:py-4 rounded-full flex flex-col items-center justify-center transition-colors duration-300",
                            isActive ? "text-white z-10" : "text-white/50 hover:text-white/80"
                        )}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="active-nav-pill"
                                className="absolute inset-0 rounded-full"
                                transition={{
                                    type: "spring",
                                    stiffness: 500,
                                    damping: 35,
                                    mass: 1
                                }}
                                style={{
                                    // Apple iOS Transparent Segment Style
                                    background: 'rgba(255, 255, 255, 0.15)',
                                    boxShadow: `
                                        0 3px 8px rgba(0,0,0,0.12), 
                                        0 3px 1px rgba(0,0,0,0.04),
                                        0 0 0 0.5px rgba(255,255,255,0.05),
                                        inset 0 1px 1px rgba(255,255,255,0.15)
                                    `,
                                    zIndex: -1
                                }}
                            />
                        )}
                        <Icon 
                            className="w-6 h-6 relative z-10 transition-transform duration-300" 
                            strokeWidth={isActive ? 2.5 : 2} 
                            style={{ filter: isActive ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none' }}
                        />
                        <span className="sr-only">{tab.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
