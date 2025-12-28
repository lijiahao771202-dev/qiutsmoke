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

    { id: 'snowy-mountain', url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?q=80&w=1200&auto=format&fit=crop', name: '雪山银装' },
    { id: 'green-valley', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1200&auto=format&fit=crop', name: '翠绿山谷' },
    { id: 'ocean-waves', url: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?q=80&w=1200&auto=format&fit=crop', name: '海浪拍岸' },
    { id: 'misty-forest', url: 'https://images.unsplash.com/photo-1511497584788-876760111969?q=80&w=1200&auto=format&fit=crop', name: '迷雾森林' },
    { id: 'flower-meadow', url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?q=80&w=1200&auto=format&fit=crop', name: '花海草原' },
    { id: 'rock-formation', url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=1200&auto=format&fit=crop', name: '奇岩异石' },
    { id: 'clear-lake', url: '/clear-lake.jpg', name: '清澈湖水' },
    { id: 'starry-night', url: 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?q=80&w=1200&auto=format&fit=crop', name: '星空璀璨' },

    { id: 'calm-sea', url: 'https://images.unsplash.com/photo-1478827536114-da961b7f86d2?q=80&w=1200&auto=format&fit=crop', name: '平静海面' },
    { id: 'foggy-hills', url: 'https://images.unsplash.com/photo-1487621167305-5d248087c724?q=80&w=1200&auto=format&fit=crop', name: '云雾缭绕' },
    { id: 'sunrise-peak', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1200&auto=format&fit=crop', name: '日出山巅' },
    { id: 'tropical-island', url: 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?q=80&w=1200&auto=format&fit=crop', name: '热带岛屿' },

    // ============ 极简 & 禅意 Zen & Minimalist ============
    { id: 'zen', url: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?q=80&w=1200&auto=format&fit=crop', name: '青青翠竹' },
    { id: 'minimal', url: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=1200&auto=format&fit=crop', name: '极简白' },


    // ============ 雨景 & 纹理 Textures ============
    { id: 'rain', url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=1200&auto=format&fit=crop', name: '雨滴窗' },

    // ============ 新增自然风景 More Nature ============
    { id: 'glacier', url: 'https://images.unsplash.com/photo-1476610182048-b716b8518aae?q=80&w=1200&auto=format&fit=crop', name: '冰川蓝光' },
    { id: 'canyon', url: 'https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?q=80&w=1200&auto=format&fit=crop', name: '峡谷奇观' },
    { id: 'rice-terrace', url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1200&auto=format&fit=crop', name: '梯田金黄' },
    { id: 'aurora', url: 'https://images.unsplash.com/photo-1483347756197-71ef80e95f73?q=80&w=1200&auto=format&fit=crop', name: '极光梦幻' },
    { id: 'rainforest', url: 'https://images.unsplash.com/photo-1516298773066-c48f8e9bd92b?q=80&w=1200&auto=format&fit=crop', name: '热带雨林' },
    { id: 'cliff-ocean', url: 'https://images.unsplash.com/photo-1494548162494-384bba4ab999?q=80&w=1200&auto=format&fit=crop', name: '悬崖海岸' },
    { id: 'tulip-field', url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?q=80&w=1200&auto=format&fit=crop', name: '郁金香海' },
    { id: 'mountain-lake', url: 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?q=80&w=1200&auto=format&fit=crop', name: '高山湖泊' },
    { id: 'sunset-beach', url: 'https://images.unsplash.com/photo-1476673160081-cf065f30be67?q=80&w=1200&auto=format&fit=crop', name: '海滩夕阳' },
    { id: 'green-hills', url: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1200&auto=format&fit=crop', name: '绿意山丘' },
    { id: 'lotus', url: 'https://images.unsplash.com/photo-1474557157379-8aa74a6ef541?q=80&w=1200&auto=format&fit=crop', name: '莲花池塘' },
    { id: 'fjord', url: 'https://images.unsplash.com/photo-1520769945061-0a448c463865?q=80&w=1200&auto=format&fit=crop', name: '峡湾风光' },
];

interface BackgroundContextType {
    currentWallpaper: string; // URL
    wallpaperId: string;
    setWallpaper: (id: string) => void;
    nextWallpaper: () => void;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

export function BackgroundProvider({ children }: { children: ReactNode }) {
    const [wallpaperId, setWallpaperId] = useState('clear-lake');

    // Load saved preference
    useEffect(() => {
        const saved = localStorage.getItem('app-wallpaper-id');
        if (saved) {
            // Validate if saved ID exists
            const exists = WALLPAPERS.find(w => w.id === saved);
            if (exists) {
                setWallpaperId(saved);
            } else {
                setWallpaperId('clear-lake');
            }
        } else {
            setWallpaperId('clear-lake');
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
