"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Curated list of high-quality scenic wallpapers (Unsplash IDs)
// Curated list of high-quality scenic wallpapers (Unsplash IDs)
export const WALLPAPERS = [
    { id: 'default', url: '', name: 'Default Aurora' },
    // Nature & Landscapes
    { id: 'mountains', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=3540&auto=format&fit=crop', name: 'Misty Mountains' },
    { id: 'ocean', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=3546&auto=format&fit=crop', name: 'Tropical Beach' },
    { id: 'forest', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=3540&auto=format&fit=crop', name: 'Deep Forest' },
    { id: 'sunset', url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?q=80&w=3540&auto=format&fit=crop', name: 'Golden Sunset' },
    { id: 'winter', url: 'https://images.unsplash.com/photo-1478265867543-acde6a813442?q=80&w=3540&auto=format&fit=crop', name: 'Winter Silence' },
    { id: 'desert', url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=3540&auto=format&fit=crop', name: 'Sahara Dunes' },

    // Abstract & Gradients
    { id: 'nebula', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2622&auto=format&fit=crop', name: 'Cosmic Nebula' },
    { id: 'liquid', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=3540&auto=format&fit=crop', name: 'Liquid Oil' },
    { id: 'gradient', url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=3540&auto=format&fit=crop', name: 'Holographic' },
    { id: 'glass', url: 'https://images.unsplash.com/photo-1501786223405-6d024d7c3b8d?q=80&w=3540&auto=format&fit=crop', name: 'Frosted Glass' },

    // City & Cyberpunk
    { id: 'neon', url: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?q=80&w=3540&auto=format&fit=crop', name: 'Neon Nights' },
    { id: 'tokyo', url: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=3540&auto=format&fit=crop', name: 'Tokyo Rain' },
    { id: 'nyc', url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=3540&auto=format&fit=crop', name: 'NYC Skyline' },

    // Zen & Minimalist
    { id: 'zen', url: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?q=80&w=3540&auto=format&fit=crop', name: 'Green Bamboo' },
    { id: 'minimal', url: 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?q=80&w=3540&auto=format&fit=crop', name: 'White Minimal' },
    { id: 'stone', url: 'https://images.unsplash.com/photo-1445262102387-5fbb30a5e556?q=80&w=3540&auto=format&fit=crop', name: 'Black Sand' },

    // Textures
    { id: 'rain', url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=3540&auto=format&fit=crop', name: 'Rainy Window' },
    { id: 'paper', url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?q=80&w=3540&auto=format&fit=crop', name: 'Crumpled Paper' },
];

interface BackgroundContextType {
    currentWallpaper: string; // URL
    wallpaperId: string;
    setWallpaper: (id: string) => void;
    nextWallpaper: () => void;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

export function BackgroundProvider({ children }: { children: ReactNode }) {
    const [wallpaperId, setWallpaperId] = useState('default');

    // Load saved preference
    useEffect(() => {
        const saved = localStorage.getItem('app-wallpaper-id');
        if (saved) {
            // Validate if saved ID exists
            const exists = WALLPAPERS.find(w => w.id === saved);
            // eslint-disable-next-line react-hooks/set-state-in-effect
            if (exists) setWallpaperId(saved);
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
