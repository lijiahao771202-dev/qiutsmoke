"use client";

import { motion } from "framer-motion";

/**
 * 深色流体动态背景
 * 设计用于匹配iOS 26的状态栏动态着色系统
 * 使用深色调确保状态栏文字可见性
 */
export function DarkFluidBackground() {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: -1 }}>
            {/* 基础深色背景 */}
            <div className="absolute inset-0 bg-gradient-to-b from-black via-slate-950 to-black" />

            {/* 流动的深色光斑 1 - 深紫色 */}
            <motion.div
                className="absolute w-[600px] h-[600px] rounded-full blur-[150px] opacity-30"
                style={{
                    background: 'radial-gradient(circle, rgba(88, 28, 135, 0.8) 0%, transparent 70%)',
                    top: '-20%',
                    left: '-10%',
                }}
                animate={{
                    x: [0, 100, 50, 0],
                    y: [0, 50, 100, 0],
                    scale: [1, 1.2, 0.9, 1],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />

            {/* 流动的深色光斑 2 - 深蓝色 */}
            <motion.div
                className="absolute w-[500px] h-[500px] rounded-full blur-[120px] opacity-25"
                style={{
                    background: 'radial-gradient(circle, rgba(30, 58, 138, 0.8) 0%, transparent 70%)',
                    top: '30%',
                    right: '-15%',
                }}
                animate={{
                    x: [0, -80, -40, 0],
                    y: [0, 80, 40, 0],
                    scale: [1, 0.8, 1.1, 1],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />

            {/* 流动的深色光斑 3 - 深青色 */}
            <motion.div
                className="absolute w-[450px] h-[450px] rounded-full blur-[100px] opacity-20"
                style={{
                    background: 'radial-gradient(circle, rgba(6, 78, 59, 0.8) 0%, transparent 70%)',
                    bottom: '10%',
                    left: '20%',
                }}
                animate={{
                    x: [0, 60, -30, 0],
                    y: [0, -60, 30, 0],
                    scale: [1, 1.15, 0.95, 1],
                }}
                transition={{
                    duration: 18,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />

            {/* 状态栏区域专用深色渐变 - 确保顶部始终是深色 */}
            <div
                className="absolute top-0 left-0 right-0 h-32"
                style={{
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)',
                }}
            />

            {/* 细腻的噪点纹理层 */}
            <div
                className="absolute inset-0 opacity-[0.015]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
            />
        </div>
    );
}
