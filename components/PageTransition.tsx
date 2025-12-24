"use client";

import { motion, PanInfo } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useRef } from "react";
import { useHaptics } from "@/lib/hooks/useHaptics";

// 页面路由顺序（用于滑动方向判断）
const PAGES = ["/", "/meditate", "/tts-studio", "/stats"];

interface PageTransitionProps {
    children: ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { triggerLight } = useHaptics();
    const isDragging = useRef(false);

    // 获取当前页面索引
    const currentIndex = PAGES.indexOf(pathname || "/");

    // 处理滑动手势
    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const threshold = 80;
        const velocity = 500;

        if (info.offset.x > threshold || info.velocity.x > velocity) {
            if (currentIndex > 0) {
                triggerLight();
                router.push(PAGES[currentIndex - 1]);
            }
        }
        else if (info.offset.x < -threshold || info.velocity.x < -velocity) {
            if (currentIndex < PAGES.length - 1) {
                triggerLight();
                router.push(PAGES[currentIndex + 1]);
            }
        }

        isDragging.current = false;
    };

    // 🔥 优化后的轻量级动画配置
    const lightTransition = {
        type: "tween",     // 使用 tween 代替 spring，更轻量
        duration: 0.25,    // 短时动画
        ease: [0.25, 0.1, 0.25, 1], // 平滑曲线
    };

    // 检查是否是主页面
    const isMainPage = PAGES.includes(pathname || "");

    // 轻量级动画变体（只用 transform，开启 GPU 加速）
    const variants = {
        initial: {
            x: 40,
            // 不用 scale 减少计算
        },
        animate: {
            x: 0,
        },
        exit: {
            x: -30,
        },
    };

    if (!isMainPage) {
        return (
            <motion.div
                key={pathname}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={lightTransition}
                style={{
                    width: "100%",
                    height: "100%",
                    // 🔥 GPU 加速
                    willChange: "transform",
                    transform: "translateZ(0)",
                }}
            >
                {children}
            </motion.div>
        );
    }

    return (
        <motion.div
            key={pathname}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={lightTransition}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragStart={() => { isDragging.current = true; }}
            onDragEnd={handleDragEnd}
            style={{
                width: "100%",
                height: "100%",
                touchAction: "pan-y",
                // 🔥 GPU 加速
                willChange: "transform",
                transform: "translateZ(0)",
            }}
        >
            {children}
        </motion.div>
    );
}
