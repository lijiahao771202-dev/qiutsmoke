"use client";

import React, { useState } from "react";
import { motion, PanInfo, useMotionValue, useTransform } from "framer-motion";

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

        // Swipe LEFT to go forward (next card) -> Current card goes to bottom
        if (info.offset.x < -swipeThreshold) {
            setCurrentIndex((prev) => (prev + 1) % count);
        }
        // Swipe RIGHT to go backward (prev card) -> Bottom card comes to top
        else if (info.offset.x > swipeThreshold) {
            setCurrentIndex((prev) => (prev - 1 + count) % count);
        }
    };

    return (
        <div className={`relative w-full h-full perspective-1000 ${className}`}>
            {childrenArray.map((child, index) => {
                // Circular Stack Logic
                // Calculate position in the stack (0 = Front, 1 = Behind 1, ... N-1 = Bottom)
                const position = (index - currentIndex + count) % count;

                // Visual States based on position
                const isActive = position === 0;
                const isBottom = position === count - 1; // The card at the very back

                // Limit visible stack depth to 3 usually, but for small counts render all
                // If position is excessively large (e.g. 10 cards), hide > 3
                // But we need to handle the 'fly in from bottom' effect
                const isVisible = position < 4 || isBottom;

                if (!isVisible) return null;

                // "Organic" offsets (stable based on index)
                const randomRotate = ((index * 7) % 10) - 5;
                const randomX = ((index * 23) % 30) - 15;

                return (
                    <motion.div
                        key={index}
                        className="absolute inset-0 preserve-3d"
                        drag={isActive ? "x" : false}
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.1}
                        onDragEnd={onDragEnd}

                        initial={false}
                        animate={{
                            // Scale: Front=1, Behind=shrink
                            scale: isActive ? 1 : Math.max(0.85, 1 - position * 0.08),

                            // Y: Front=0, Behind=Move Up (Negative)
                            // Note: If isBottom (last card), we might want it 'waiting' at the very back
                            y: isActive ? 0 : -(position * 50),

                            // X & Rotate:
                            // Active: Centered, Straight
                            // Stack: Irregular
                            x: isActive ? 0 : randomX,
                            rotate: isActive ? 0 : randomRotate,

                            // Z Index: Front=100, Back=decreases
                            zIndex: 100 - position,

                            // Opacity
                            opacity: isActive ? 1 : 1 - (position * 0.15),
                        }}
                        transition={{
                            type: "spring",
                            stiffness: 260,
                            damping: 20
                        }}
                        style={{
                            transformOrigin: "center bottom",
                            zIndex: 100 - position
                        }}
                    >
                        {/* Interaction Overlay for clicking upcoming cards */}
                        {position > 0 && ( // Any card not active is "upcoming" in a circular sense
                            <div
                                className="absolute inset-0 z-50 cursor-pointer"
                                onClick={() => setCurrentIndex(index)}
                            />
                        )}

                        {/* Darken upcoming cards for depth */}
                        {/* Darken upcoming cards for depth */}
                        {position > 0 && (
                            <div className="absolute inset-0 bg-black/40 rounded-[2.5rem] z-40 pointer-events-none transition-opacity duration-300" />
                        )}

                        {child}
                    </motion.div>
                );
            })}

            {/* --- Pagination Indicator --- */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-50">
                {childrenArray.map((_, i) => (
                    <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${i === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/20'}`}
                    />
                ))}
            </div>
        </div>
    );
}
