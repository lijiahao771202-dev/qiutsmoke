"use client";

import React, { useState, useEffect } from "react";
import { motion, PanInfo, useAnimation } from "framer-motion";

interface CardStackProps {
    children: React.ReactNode[];
    className?: string;
}

export function CardStack({ children, className = "" }: CardStackProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const childrenArray = React.Children.toArray(children);
    const count = childrenArray.length;

    // Handle swipe gestures
    const onDragEnd = (event: any, info: PanInfo) => {
        const swipeThreshold = 50;

        // Swipe LEFT -> Next Card
        if (info.offset.x < -swipeThreshold) {
            setCurrentIndex((prev) => (prev + 1) % count);
        }
        // Swipe RIGHT -> Prev Card
        else if (info.offset.x > swipeThreshold) {
            setCurrentIndex((prev) => (prev - 1 + count) % count);
        }
    };

    return (
        <div className={`relative w-full h-full perspective-[1200px] preserve-3d group ${className}`}>
            {childrenArray.map((child, index) => {
                // Calculate position relative to current index
                // We handle the circular wrap-around logic here for a consistent "helix" view
                let offset = (index - currentIndex);

                // Adjust offset for infinite scroll illusion (keep items close to center)
                if (offset > count / 2) offset -= count;
                if (offset < -count / 2) offset += count;

                // Visibility check: Only show near items for performance & visual clarity
                const isVisible = Math.abs(offset) <= 3;

                // HELIX & ZERO-G CONFIGURATION
                const isActive = offset === 0;

                // 1. Spiral Position
                // We map the offset to 3D coordinates on a spiral curve
                const zOffset = -Math.abs(offset) * 120; // Depth: receding into screen
                const yOffset = offset * 25; // Vertical: gentle cascade
                const xOffset = offset * 40; // Horizontal: spread out slightly
                const rotateY = offset * -15; // Y-Rotation: Face inward
                const rotateZ = offset * 2; // Z-Rotation: Slight localized tilt

                // 2. Scale & Opacity
                const scale = isActive ? 1 : Math.max(0.8, 1 - Math.abs(offset) * 0.15);
                const opacity = 1; // 🔥 Force Solid Glass (User Request: No Transparency)
                const blur = isActive ? 0 : Math.abs(offset) * 2; // Blur distant cards

                // 3. Floating Animation for Zero-G Effect
                // Randomized float parameters based on index to desynchronize
                const floatDuration = 6 + (index % 4); // Slower, heavier float (6-9s)
                const floatY = 12 + (index % 6); // Slightly deeper float range

                return (
                    <motion.div
                        key={index}
                        className="absolute inset-0 will-change-transform"
                        style={{
                            transformStyle: "preserve-3d",
                            zIndex: 100 - Math.abs(offset), // Center item on top
                            pointerEvents: isVisible ? "auto" : "none", // Allow interaction on all visible cards
                        }}
                        initial={{
                            x: 0,
                            y: 120, // 🚀 Deeper start for dramatic silky entrance
                            scale: 0.9,
                            rotateX: 0,
                            rotateY: 0
                        }}
                        animate={{
                            x: xOffset,
                            y: yOffset,
                            z: zOffset,
                            rotateY: rotateY,
                            rotateZ: rotateZ,
                            scale: scale,
                            opacity: opacity,
                        }}
                        whileHover={isActive ? { scale: 1.02, y: yOffset - 5 } : { scale: scale * 1.03, y: yOffset - 15 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{
                            // 🍎 Silky Non-Linear Physics
                            // Custom Bezier: Starts fast, lands extremely soft (like silk)
                            duration: 0.8,
                            ease: [0.23, 1, 0.32, 1], // Cubic Bezier (Apple-like easeOut)
                            // Separate opacity for quicker feedback
                            opacity: { duration: 0.5, ease: "linear" },
                            // Staggered delay logic could be here, but framer handles prop updates well.
                            // We let natural React updates handle swipe delays.
                        }}
                        drag={isActive ? "x" : false}
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.1}
                        onDragEnd={onDragEnd}
                        onClick={() => {
                            if (!isActive && isVisible) {
                                triggerLight();
                                setCurrentIndex(index);
                            }
                        }}
                    >
                        {/* Zero-G Floating Container - "Breathing" Effect */}
                        <motion.div
                            className="w-full h-full relative preserve-3d"
                            initial={{ y: 0, rotateX: 0, rotateZ: 0 }}
                            animate={{
                                y: isActive ? [0, -floatY, 0] : [0, -floatY * 0.6, 0],
                                rotateX: isActive ? [0, 1.5, 0] : 0,
                                rotateZ: isActive ? [0, 0.5, 0] : 0,
                            }}
                            transition={{
                                duration: floatDuration,
                                repeat: Infinity,
                                ease: "easeInOut", // Sine wave float
                                delay: 1.2 + (index * 0.2) // Wait for entrance to finish before floating
                            }}
                        >
                            {child}
                        </motion.div>
                    </motion.div>
                );
            })}

            {/* --- Pagination Indicator --- */}
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex gap-2 z-50">
                {childrenArray.map((_, i) => (
                    <div
                        key={i}
                        className={`h-1 rounded-full transition-all duration-500 ease-out ${i === currentIndex
                            ? 'w-8 bg-white shadow-[0_0_10px_white]'
                            : 'w-1.5 bg-white/10'
                            }`}
                    />
                ))}
            </div>
        </div>
    );
}
