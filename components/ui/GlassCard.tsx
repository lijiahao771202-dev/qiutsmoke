
"use client";

import { cn } from "@/lib/utils";
import React, { useRef } from "react";
import { useHaptics } from "@/lib/hooks/useHaptics";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    transparency?: "low" | "medium" | "high";
    hoverEffect?: boolean;
}

export function GlassCard({
    children,
    className,
    transparency = "medium",
    hoverEffect = false,
    onMouseDown,
    ...props
}: GlassCardProps) {
    const divRef = useRef<HTMLDivElement>(null);
    const { triggerLight } = useHaptics();

    const bgOpacity = {
        low: "bg-black/60",
        medium: "bg-black/30",
        high: "bg-black/10",
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!hoverEffect || !divRef.current) return;

        const div = divRef.current;
        const rect = div.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        div.style.setProperty("--mouse-x", `${x}px`);
        div.style.setProperty("--mouse-y", `${y}px`);
    };

    return (
        <div
            ref={divRef}
            onMouseMove={handleMouseMove}
            onTouchStart={(e) => {
                triggerLight(); // 触发轻触震动
                if (props.onClick) {
                    // 允许 onClick 正常触发
                }
            }}
            className={cn(
                "relative overflow-hidden rounded-[2rem]",
                // L3: Adaptive Tint - Boost saturation/contrast to pull background color through
                "backdrop-blur-[30px] backdrop-saturate-150 backdrop-contrast-125",
                "border border-white/10", // Base border
                bgOpacity[transparency],
                "group", // For hover states
                hoverEffect && "transition-[background-color,border-color,shadow,opacity] duration-500 hover:bg-white/[0.05] hover:scale-[1.01] hover:shadow-2xl",
                className
            )}
            style={{
                // L2: Chromatic Aberration & Premium Shadow Stack
                boxShadow: `
          inset 0 0 0 1px rgba(255, 255, 255, 0.08),
          inset 1px 0 0 0 rgba(255, 200, 200, 0.05), /* Subtle Red Shift */
          inset -1px 0 0 0 rgba(200, 200, 255, 0.05), /* Subtle Blue Shift */
          0 20px 40px -4px rgba(0, 0, 0, 0.2),
          0 10px 20px -4px rgba(0, 0, 0, 0.1)
        `,
                transform: "translate3d(0,0,0)",
                willChange: "transform, opacity", // GPU 层提升
                contain: "layout style paint", // 渲染隔离优化
            }}
            {...props}
        >
            {/* L1: Spotlight Hover Effect */}
            {hoverEffect && (
                <div
                    className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-0"
                    style={{
                        background: `radial-gradient(800px circle at var(--mouse-x) var(--mouse-y), rgba(255, 255, 255, 0.08), transparent 40%)`,
                    }}
                />
            )}

            {/* Gradient Border Interceptor */}
            <div
                className="absolute inset-0 rounded-[2rem] pointer-events-none border border-white/10 z-10"
                style={{
                    maskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
                    WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 100%)"
                }}
            />

            {/* Top Rim Light (Sharp) */}
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-70 z-10" />

            {/* Diagonal Shine / Sheen */}
            <div
                className="absolute -inset-full top-0 block bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -skew-x-12 z-0"
                style={{ transform: 'translateX(-100%)', animation: hoverEffect ? 'shine 8s infinite' : 'none' }}
            />

            {/* Content */}
            <div className="relative z-20">{children}</div>

            {/* Subtle Noise Texture */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-[url('/noise.svg')] z-10" />
        </div>
    );
}
