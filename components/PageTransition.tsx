"use client";

import { motion, AnimatePresence, PanInfo } from "framer-motion";
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
        const threshold = 80; // 滑动阈值
        const velocity = 500; // 速度阈值

        // 向右滑动 = 上一页
        if (info.offset.x > threshold || info.velocity.x > velocity) {
            if (currentIndex > 0) {
                triggerLight();
                router.push(PAGES[currentIndex - 1]);
            }
        }
        // 向左滑动 = 下一页
        else if (info.offset.x < -threshold || info.velocity.x < -velocity) {
            if (currentIndex < PAGES.length - 1) {
                triggerLight();
                router.push(PAGES[currentIndex + 1]);
            }
        }

        isDragging.current = false;
    };

    // 页面过渡动画变体
    const variants = {
        initial: {
            opacity: 0,
            x: 20,
        },
        enter: {
            opacity: 1,
            x: 0,
            transition: {
                duration: 0.3,
                ease: [0.25, 0.1, 0.25, 1],
            },
        },
        exit: {
            opacity: 0,
            x: -20,
            transition: {
                duration: 0.2,
                ease: [0.25, 0.1, 0.25, 1],
            },
        },
    };

    // 检查是否是主页面（需要滑动支持）
    const isMainPage = PAGES.includes(pathname || "");

    if (!isMainPage) {
        // 非主页面只用淡入淡出
        return (
            <motion.div
                key={pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
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
            animate="enter"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragStart={() => { isDragging.current = true; }}
            onDragEnd={handleDragEnd}
            style={{
                width: "100%",
                height: "100%",
                touchAction: "pan-y", // 允许垂直滚动，水平滑动用于页面切换
            }}
        >
            {children}
        </motion.div>
    );
}
