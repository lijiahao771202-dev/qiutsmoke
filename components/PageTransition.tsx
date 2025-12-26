"use client";

import { motion, PanInfo } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useRef } from "react";
import { useHaptics } from "@/lib/hooks/useHaptics";

// 页面路由顺序（用于滑动方向判断）
const PAGES = ["/", "/meditate", "/tts-studio", "/stats"];

// 🔥 重页面列表 - 这些页面禁用过渡动画
const HEAVY_PAGES = ["/tts-studio"];

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

    // 检查是否是主页面
    const isMainPage = PAGES.includes(pathname || "");

    // 🔥 检查是否是重页面
    const isHeavyPage = HEAVY_PAGES.includes(pathname || "");

    // 重页面：不加过渡动画，只支持滑动手势
    if (isHeavyPage) {
        return (
            <motion.div
                key={pathname}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.15}
                onDragStart={() => { isDragging.current = true; }}
                onDragEnd={handleDragEnd}
                style={{
                    width: "100%",
                    height: "100%",
                    touchAction: "pan-y",
                }}
            >
                {children}
            </motion.div>
        );
    }

    // 交叉淡化动画 - 新旧页面同时存在，不会闪烁
    const transition = {
        duration: 0.15,
        ease: "easeOut",
    };

    const variants = {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
    };

    if (!isMainPage) {
        return (
            <motion.div
                key={pathname}
                variants={variants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={transition}
                style={{
                    width: "100%",
                    height: "100%",
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
            transition={transition}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragStart={() => { isDragging.current = true; }}
            onDragEnd={handleDragEnd}
            style={{
                width: "100%",
                height: "100%",
                touchAction: "pan-y",
                willChange: "transform",
                transform: "translateZ(0)",
            }}
        >
            {children}
        </motion.div>
    );
}
