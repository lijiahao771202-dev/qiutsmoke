import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useHapticBreathing } from "@/lib/hooks/useHapticBreathing";

export function BreathingBubble() {
    const { triggerInhale, triggerHold, triggerExhale } = useHapticBreathing();
    const [phase, setPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
    const [text, setText] = useState("吸气");

    useEffect(() => {
        let isCancelled = false;

        const cycle = async () => {
            if (isCancelled) return;

            // Inhale (4s)
            setPhase("inhale");
            setText("吸气 (4s)");
            triggerInhale();
            await new Promise(r => setTimeout(r, 4000));
            if (isCancelled) return;

            // Hold (7s)
            setPhase("hold");
            setText("保持 (7s)");
            triggerHold();
            await new Promise(r => setTimeout(r, 7000));
            if (isCancelled) return;

            // Exhale (8s)
            setPhase("exhale");
            setText("呼气 (8s)");
            triggerExhale();
            await new Promise(r => setTimeout(r, 8000));
            if (isCancelled) return;

            // Loop
            cycle();
        };

        cycle();

        return () => {
            isCancelled = true;
        };
    }, []);

    return (
        <div className="flex flex-col items-center justify-center p-6 my-2 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
            <div className="relative flex items-center justify-center w-32 h-32 mb-4">
                {/* Outer Ring */}
                <motion.div
                    className="absolute inset-0 rounded-full border-2 border-rose-400/30"
                    animate={{
                        scale: phase === "inhale" ? 1.2 : phase === "hold" ? 1.2 : 0.8,
                        opacity: phase === "hold" ? 0.5 : 1
                    }}
                    transition={{
                        duration: phase === "inhale" ? 4 : phase === "exhale" ? 8 : 0.5,
                        ease: "easeInOut"
                    }}
                />

                {/* Core Bubble */}
                <motion.div
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-300 to-amber-200 shadow-[0_0_30px_rgba(251,113,133,0.4)]"
                    animate={{
                        scale: phase === "inhale" ? 1.5 : phase === "hold" ? 1.5 : 0.8,
                    }}
                    transition={{
                        duration: phase === "inhale" ? 4 : phase === "exhale" ? 8 : 0.5,
                        ease: "easeInOut"
                    }}
                />

                {/* Text Overlay */}
                <motion.div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    key={phase}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <span className="text-xs font-medium text-white/80 drop-shadow-md">
                        {text}
                    </span>
                </motion.div>
            </div>
            <p className="text-xs text-white/40 text-center">
                跟随圆球律动调整呼吸<br />
                4-7-8 舒缓法
            </p>
        </div>
    );
}
