'use client';

/**
 * 🔄 useSwipeNavigation - 左右滑动切换页面
 * 
 * iOS 原生体验：水平滑动超过阈值时自动切换到相邻标签页
 * 支持防误触：垂直滑动时不触发，在输入框/滑块内不触发
 */

import { useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// 标签页顺序（与 NavBar 一致）
const TAB_ORDER = ['/', '/meditate', '/tts-studio', '/stats'];

// 手势配置
const SWIPE_THRESHOLD = 80;       // 最小滑动距离（px）
const SWIPE_VELOCITY = 0.3;        // 最小滑动速度（px/ms）
const VERTICAL_TOLERANCE = 1.5;    // 水平/垂直比例阈值（大于此值才算水平滑动）

export function useSwipeNavigation() {
    const router = useRouter();
    const pathname = usePathname();
    const touchRef = useRef<{
        startX: number;
        startY: number;
        startTime: number;
        isTracking: boolean;
    } | null>(null);

    const handleSwipe = useCallback((direction: 'left' | 'right') => {
        const currentIndex = TAB_ORDER.indexOf(pathname);
        if (currentIndex === -1) return; // 不在标签页内

        let nextIndex: number;
        if (direction === 'left') {
            // 左滑 → 下一页
            nextIndex = currentIndex + 1;
        } else {
            // 右滑 → 上一页
            nextIndex = currentIndex - 1;
        }

        // 边界检查
        if (nextIndex < 0 || nextIndex >= TAB_ORDER.length) return;

        const nextPath = TAB_ORDER[nextIndex];
        router.push(nextPath);
    }, [pathname, router]);

    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            // 忽略多指触摸
            if (e.touches.length !== 1) return;

            // 忽略在特定元素上的触摸（输入框、滑块、canvas 等）
            const target = e.target as HTMLElement;
            const tag = target.tagName.toLowerCase();
            if (['input', 'textarea', 'select', 'canvas', 'video'].includes(tag)) return;
            if (target.closest('[data-no-swipe]')) return;
            if (target.closest('input, textarea, select, canvas')) return;

            // 忽略在滑块/可滚动容器上的触摸
            if (target.closest('[role="slider"]') || target.closest('.overflow-x-auto')) return;

            const touch = e.touches[0];
            touchRef.current = {
                startX: touch.clientX,
                startY: touch.clientY,
                startTime: Date.now(),
                isTracking: true,
            };
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!touchRef.current?.isTracking) return;

            const touch = e.touches[0];
            const deltaX = Math.abs(touch.clientX - touchRef.current.startX);
            const deltaY = Math.abs(touch.clientY - touchRef.current.startY);

            // 如果垂直移动更多，停止追踪（用户在滚动页面）
            if (deltaY > 10 && deltaX / deltaY < VERTICAL_TOLERANCE) {
                touchRef.current.isTracking = false;
            }
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (!touchRef.current?.isTracking) {
                touchRef.current = null;
                return;
            }

            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - touchRef.current.startX;
            const deltaY = Math.abs(touch.clientY - touchRef.current.startY);
            const elapsed = Date.now() - touchRef.current.startTime;
            const velocity = Math.abs(deltaX) / elapsed;

            touchRef.current = null;

            // 检查是否满足滑动条件
            const absX = Math.abs(deltaX);
            if (absX < SWIPE_THRESHOLD) return;        // 距离不够
            if (velocity < SWIPE_VELOCITY) return;       // 速度不够
            if (absX / (deltaY || 1) < VERTICAL_TOLERANCE) return; // 方向不对

            handleSwipe(deltaX < 0 ? 'left' : 'right');
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleSwipe]);
}
