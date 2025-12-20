"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Curated list of high-quality scenic wallpapers (Unsplash IDs)
// Curated list of high-quality scenic wallpapers (Unsplash IDs)
export const WALLPAPERS = [
    // 动态背景 - 专为iOS 26状态栏适配设计
    { id: 'dark-fluid', url: '', name: '深色流体 ✨', type: 'dynamic' as const },
    { id: 'default', url: '/gerbera-9665515.jpg', name: 'Gerbera' },

    // ============ 自然风景 Nature & Landscapes ============
    { id: 'mountains', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1200&auto=format&fit=crop', name: '雾中山峰' },
    { id: 'ocean', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop', name: '热带海滩' },
    { id: 'forest', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1200&auto=format&fit=crop', name: '深林秘境' },
    { id: 'sunset', url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=1200&auto=format&fit=crop', name: '金色日落' },
    { id: 'winter', url: 'https://images.unsplash.com/photo-1478265867543-acde6a813442?q=80&w=1200&auto=format&fit=crop', name: '冬日静谧' },
    { id: 'desert', url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=1200&auto=format&fit=crop', name: '撒哈拉沙丘' },

    // 新增自然风景 (20个)
    { id: 'lake-reflection', url: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?q=80&w=1200&auto=format&fit=crop', name: '湖面倒影' },
    { id: 'cherry-blossom', url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?q=80&w=1200&auto=format&fit=crop', name: '樱花烂漫' },
    { id: 'northern-lights', url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?q=80&w=1200&auto=format&fit=crop', name: '北极光' },
    { id: 'waterfall', url: 'https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?q=80&w=1200&auto=format&fit=crop', name: '瀑布飞流' },
    { id: 'bamboo-forest', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=1200&auto=format&fit=crop', name: '竹林深处' },
    { id: 'lavender-field', url: 'https://images.unsplash.com/photo-1499002238440-d264edd596ec?q=80&w=1200&auto=format&fit=crop', name: '薰衣草田' },
    { id: 'autumn-leaves', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1200&auto=format&fit=crop', name: '秋叶满枝' },
    { id: 'snowy-mountain', url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=1200&auto=format&fit=crop', name: '雪山银装' },
    { id: 'green-valley', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1200&auto=format&fit=crop', name: '翠绿山谷' },
    { id: 'ocean-waves', url: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?q=80&w=1200&auto=format&fit=crop', name: '海浪拍岸' },
    { id: 'misty-forest', url: 'https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=1200&auto=format&fit=crop', name: '迷雾森林' },
    { id: 'flower-meadow', url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?q=80&w=1200&auto=format&fit=crop', name: '花海草原' },
    { id: 'rock-formation', url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=1200&auto=format&fit=crop', name: '奇岩异石' },
    { id: 'clear-lake', url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1200&auto=format&fit=crop', name: '清澈湖水' },
    { id: 'starry-night', url: 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?q=80&w=1200&auto=format&fit=crop', name: '星空璀璨' },
    { id: 'spring-bloom', url: 'https://images.unsplash.com/photo-1462275646964-a0e3571f4f7f?q=80&w=1200&auto=format&fit=crop', name: '春暖花开' },
    { id: 'calm-sea', url: 'https://images.unsplash.com/photo-1478827536114-da961b7f86d2?q=80&w=1200&auto=format&fit=crop', name: '平静海面' },
    { id: 'foggy-hills', url: 'https://images.unsplash.com/photo-1487621167305-5d248087c724?q=80&w=1200&auto=format&fit=crop', name: '云雾缭绕' },
    { id: 'sunrise-peak', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1200&auto=format&fit=crop', name: '日出山巅' },
    { id: 'tropical-island', url: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?q=80&w=1200&auto=format&fit=crop', name: '热带岛屿' },

    // ============ 极简 & 禅意 Zen & Minimalist ============
    { id: 'zen', url: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?q=80&w=1200&auto=format&fit=crop', name: '青青翠竹' },
    { id: 'minimal', url: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=1200&auto=format&fit=crop', name: '极简白' },
    { id: 'stone', url: 'https://images.unsplash.com/photo-1445262102387-5fbb30a5e556?q=80&w=1200&auto=format&fit=crop', name: '黑沙滩' },

    // ============ 雨景 & 纹理 Textures ============
    { id: 'rain', url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=1200&auto=format&fit=crop', name: '雨滴窗' },

    // ============ 雨景 & 纹理 Textures ============
    { id: 'rain', url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=1200&auto=format&fit=crop', name: '雨滴窗' },
];

interface BackgroundContextType {
    currentWallpaper: string; // URL
    wallpaperId: string;
    setWallpaper: (id: string) => void;
    nextWallpaper: () => void;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

export function BackgroundProvider({ children }: { children: ReactNode }) {
    const [wallpaperId, setWallpaperId] = useState('dark-fluid');

    // Load saved preference
    useEffect(() => {
        const saved = localStorage.getItem('app-wallpaper-id');
        if (saved) {
            // Validate if saved ID exists
            const exists = WALLPAPERS.find(w => w.id === saved);
            if (exists) {
                setWallpaperId(saved);
            } else {
                setWallpaperId('dark-fluid');
            }
        } else {
            setWallpaperId('dark-fluid');
        }
    }, []);

    const setWallpaper = (id: string) => {
        setWallpaperId(id);
        localStorage.setItem('app-wallpaper-id', id);
    };

    const nextWallpaper = () => {
        const currentIndex = WALLPAPERS.findIndex(w => w.id === wallpaperId);
        const nextIndex = (currentIndex + 1) % WALLPAPERS.length;
        setWallpaper(WALLPAPERS[nextIndex].id);
    };

    const currentWallpaper = WALLPAPERS.find(w => w.id === wallpaperId)?.url || '';

    return (
        <BackgroundContext.Provider value={{ currentWallpaper, wallpaperId, setWallpaper, nextWallpaper }}>
            {children}
        </BackgroundContext.Provider>
    );
}

export function useBackground() {
    const context = useContext(BackgroundContext);
    if (context === undefined) {
        throw new Error('useBackground must be used within a BackgroundProvider');
    }
    return context;
}
