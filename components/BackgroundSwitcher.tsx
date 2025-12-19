"use client";

import { useBackground, WALLPAPERS } from './BackgroundContext';
import { Image as ImageIcon, Shuffle, X, Check, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

// 预设的状态栏颜色选项
const STATUS_BAR_COLORS = [
    { name: '透明', value: 'transparent', style: 'black-translucent' },
    { name: '黑色', value: '#000000', style: 'black' },
    { name: '默认', value: '#ffffff', style: 'default' },
    { name: '红色', value: '#ff3b30', style: 'black-translucent' },
    { name: '蓝色', value: '#007aff', style: 'black-translucent' },
    { name: '绿色', value: '#34c759', style: 'black-translucent' },
    { name: '紫色', value: '#af52de', style: 'black-translucent' },
    { name: '橙色', value: '#ff9500', style: 'black-translucent' },
];

// 动态更新状态栏颜色的函数
function updateStatusBarColor(color: string, style: string) {
    // 更新 theme-color meta 标签
    let themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeColorMeta) {
        themeColorMeta = document.createElement('meta');
        themeColorMeta.setAttribute('name', 'theme-color');
        document.head.appendChild(themeColorMeta);
    }
    themeColorMeta.setAttribute('content', color);

    // 更新 apple-mobile-web-app-status-bar-style meta 标签
    let statusBarStyleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!statusBarStyleMeta) {
        statusBarStyleMeta = document.createElement('meta');
        statusBarStyleMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
        document.head.appendChild(statusBarStyleMeta);
    }
    statusBarStyleMeta.setAttribute('content', style);

    // 更新 HTML 背景色（部分浏览器使用这个作为状态栏颜色）
    document.documentElement.style.backgroundColor = color;

    console.log(`[StatusBar Debug] theme-color: ${color}, status-bar-style: ${style}`);
}

export function BackgroundSwitcher() {
    const { setWallpaper, wallpaperId } = useBackground();
    const [isOpen, setIsOpen] = useState(false);
    const [currentStatusColor, setCurrentStatusColor] = useState('transparent');
    const [customColor, setCustomColor] = useState('#007aff');

    const handleRandom = () => {
        const available = WALLPAPERS.filter(w => w.id !== wallpaperId);
        const random = available[Math.floor(Math.random() * available.length)];
        setWallpaper(random.id);
    };

    const handleStatusBarColorChange = (color: string, style: string) => {
        setCurrentStatusColor(color);
        updateStatusBarColor(color, style);
    };

    const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const color = e.target.value;
        setCustomColor(color);
        setCurrentStatusColor(color);
        updateStatusBarColor(color, 'black-translucent');
    };

    return (
        <>
            {/* Main Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(true)}
                className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom)+5rem)] right-4 md:bottom-8 md:right-8 z-40 glass-button rounded-full p-3 shadow-2xl backdrop-blur-3xl group"
                aria-label="Change Wallpaper"
            >
                <div className="relative">
                    <ImageIcon className="w-6 h-6 text-white/80 group-hover:text-white transition-colors" />
                </div>
            </motion.button>

            {/* Modal / Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Drawer Content */}
                        <motion.div
                            initial={{ y: "100%", opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: "100%", opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-black/80 backdrop-blur-3xl border-t border-white/10 rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-white/90">显示设置</h3>
                                <div className="flex gap-2">
                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleRandom}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-medium text-white/90 transition-colors"
                                    >
                                        <Shuffle className="w-3.5 h-3.5" />
                                        <span>随机壁纸</span>
                                    </motion.button>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                                        aria-label="Close"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Status Bar Color Section */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <Palette className="w-4 h-4 text-white/60" />
                                    <span className="text-sm font-medium text-white/80">状态栏颜色 (调试)</span>
                                </div>

                                {/* Preset Colors */}
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {STATUS_BAR_COLORS.map((color) => (
                                        <button
                                            key={color.value}
                                            onClick={() => handleStatusBarColorChange(color.value, color.style)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                                                currentStatusColor === color.value
                                                    ? "bg-white text-black border-white"
                                                    : "bg-white/10 text-white/80 border-white/10 hover:bg-white/20"
                                            )}
                                            style={{
                                                boxShadow: currentStatusColor === color.value
                                                    ? `0 0 12px ${color.value === 'transparent' ? 'rgba(255,255,255,0.5)' : color.value}`
                                                    : 'none'
                                            }}
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <span
                                                    className="w-3 h-3 rounded-full border border-white/30"
                                                    style={{
                                                        backgroundColor: color.value === 'transparent' ? 'transparent' : color.value,
                                                        backgroundImage: color.value === 'transparent'
                                                            ? 'linear-gradient(45deg, #666 25%, transparent 25%), linear-gradient(-45deg, #666 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #666 75%), linear-gradient(-45deg, transparent 75%, #666 75%)'
                                                            : 'none',
                                                        backgroundSize: '4px 4px',
                                                        backgroundPosition: '0 0, 0 2px, 2px -2px, -2px 0px'
                                                    }}
                                                />
                                                {color.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                {/* Custom Color Picker */}
                                <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                                    <label className="text-xs text-white/60">自定义:</label>
                                    <input
                                        type="color"
                                        value={customColor}
                                        onChange={handleCustomColorChange}
                                        className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                                        aria-label="自定义状态栏颜色"
                                    />
                                    <span className="text-xs text-white/80 font-mono">{customColor.toUpperCase()}</span>
                                    <button
                                        onClick={() => handleStatusBarColorChange(customColor, 'black-translucent')}
                                        className="ml-auto px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white/80 transition-colors"
                                    >
                                        应用
                                    </button>
                                </div>

                                {/* Debug Info */}
                                <p className="text-[10px] text-white/40 mt-2">
                                    提示: 修改后需要重新添加到主屏幕才能完全生效。当前颜色会通过 meta 标签实时修改。
                                </p>
                            </div>

                            {/* Wallpaper Section */}
                            <h4 className="text-sm font-medium text-white/80 mb-3">壁纸选择</h4>

                            {/* Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 overflow-y-auto custom-scrollbar pb-4 pr-1 flex-1">
                                {WALLPAPERS.map((wallpaper) => {
                                    const isActive = wallpaperId === wallpaper.id;
                                    return (
                                        <motion.button
                                            key={wallpaper.id}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setWallpaper(wallpaper.id)}
                                            className={cn(
                                                "relative aspect-video rounded-xl overflow-hidden group border transition-all duration-300",
                                                isActive
                                                    ? "border-white shadow-[0_0_0_2px_rgba(255,255,255,0.3)] ring-2 ring-white/20"
                                                    : "border-white/10 hover:border-white/30"
                                            )}
                                        >
                                            {wallpaper.url ? (
                                                <img
                                                    src={wallpaper.url}
                                                    alt={wallpaper.name}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                                                    <span className="text-xs text-white/40">None</span>
                                                </div>
                                            )}

                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2">
                                                <span className="text-xs text-white/90 font-medium truncate w-full text-left">
                                                    {wallpaper.name}
                                                </span>
                                            </div>

                                            {isActive && (
                                                <div className="absolute top-2 right-2 bg-white text-black p-0.5 rounded-full shadow-lg">
                                                    <Check className="w-3 h-3" strokeWidth={3} />
                                                </div>
                                            )}
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
