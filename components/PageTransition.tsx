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

    // 弹性回弹动画配置
    const elasticTransition = {
        type: "spring",
        stiffness: 400,    // 弹簧刚度（越大越快）
        damping: 25,       // 阻尼（越小回弹越多）
        mass: 0.8,         // 质量（越小越轻盈）
        velocity: 2,       // 初始速度（增加冲击感）
    };

    // 检查是否是主页面
    const isMainPage = PAGES.includes(pathname || "");

    // 弹性回弹动画变体
    const variants = {
        initial: {
            x: 60,           // 从右侧进入
            scale: 0.98,     // 略微缩小
        },
        animate: {
            x: 0,
            scale: 1,
        },
        exit: {
            x: -40,          // 向左退出
            scale: 0.96,     // 缩小退出
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
                transition={elasticTransition}
                style={{ width: "100%", height: "100%" }}
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
            transition={elasticTransition}
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
