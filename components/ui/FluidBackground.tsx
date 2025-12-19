"use client";

import { motion } from "framer-motion";

export function FluidBackground() {
    return (
        <div className="fixed inset-0 z-0 overflow-hidden bg-[#0a0a0a]">
            {/* 
        We use three large colored orbs that move slowly.
        Colors: 
        1. Deep Blue/Purple (Aurora)
        2. Soft Cyan/Teal (Calm)
        3. Warm Rose/Pink (Life)
      */}

            {/* Orb 1: Aurora Purple */}
            <motion.div
                animate={{
                    x: [0, 100, -50, 0],
                    y: [0, -50, 50, 0],
                    scale: [1, 1.2, 1],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
                className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] rounded-full bg-purple-900/30 blur-[120px] mix-blend-screen"
            />

            {/* Orb 2: Calm Cyan */}
            <motion.div
                animate={{
                    x: [0, -70, 30, 0],
                    y: [0, 80, -30, 0],
                    scale: [1, 1.1, 0.9, 1],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2,
                }}
                className="absolute top-[20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-cyan-900/30 blur-[100px] mix-blend-screen"
            />

            {/* Orb 3: Warm Rose */}
            <motion.div
                animate={{
                    x: [0, 60, -60, 0],
                    y: [0, -60, 60, 0],
                    scale: [1, 1.3, 1],
                }}
                transition={{
                    duration: 22,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 5,
                }}
                className="absolute bottom-[-10%] left-[20%] w-[80vw] h-[80vw] rounded-full bg-rose-900/20 blur-[130px] mix-blend-screen"
            />

            {/* Global Grain/Noise Overlay for Texture */}
            <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
        </div>
    );
}
