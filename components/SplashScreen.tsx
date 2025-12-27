"use client";

import React, { useRef, useEffect, useState } from 'react';

// Cursive "hello" path data (Simplified approximation for smooth writing)
// This path is designed to look like continuous cursive handwriting
const HELLO_PATH_DATA = "M50,150 C50,150 60,80 80,60 C90,50 110,50 100,90 C90,130 60,200 60,200 C60,200 60,140 90,120 C110,105 130,120 135,140 C140,160 130,170 125,165 C120,160 120,140 135,135 C150,130 160,150 170,145 C180,140 190,100 190,90 C190,70 180,60 170,70 C160,80 155,140 155,160 C155,180 165,190 180,190 C200,190 210,140 210,130 C210,100 200,80 200,70 C200,50 215,50 220,60 C225,70 220,150 220,160 C220,180 230,190 240,185 C250,180 260,160 270,155 C280,150 290,155 295,165 C300,175 295,185 285,185 C275,185 270,175 275,165 C280,155 310,155 320,160";

// Configuration
const CONFIG = {
    WRITING_DURATION: 1800, // ms to write "hello"
    HOLD_DURATION: 1200,    // ms to hold and pulse
    DISPERSE_DURATION: 1000,// ms to fade out
    PARTICLE_COUNT: 400,
    PARTICLE_LIFE: 60,      // frames
    COLORS: [
        '#00fdbd', // Cyan
        '#9d4edd', // Purple
        '#ff006e', // Pink
        '#ffbe0b'  // Orange/Gold hint
    ]
};

interface SplashScreenProps {
    onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // --- Path Setup ---
        // Create an offscreen SVG path element to sample points
        const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathEl.setAttribute("d", HELLO_PATH_DATA);
        const totalLength = pathEl.getTotalLength();

        // --- State ---
        let startTime: number | null = null;
        let particles: any[] = [];
        let animationFrameId: number;
        let phase = 'WRITING'; // WRITING -> HOLD -> DISPERSE

        // --- Resize ---
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        // --- Particle System ---
        const createParticle = (x: number, y: number, color: string, velocityMultiplier = 0) => {
            return {
                x, y,
                vx: (Math.random() - 0.5) * velocityMultiplier,
                vy: (Math.random() - 0.5) * velocityMultiplier,
                life: CONFIG.PARTICLE_LIFE,
                maxLife: CONFIG.PARTICLE_LIFE,
                size: Math.random() * 3 + 1,
                color,
                wobble: Math.random() * Math.PI * 2
            };
        };

        const drawParticles = (progress: number) => {
            // Fade out previous frame for trail effect
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Heavy fade for clean look
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.globalCompositeOperation = 'lighter'; // Additive blending for "glow"

            // Update & Draw Particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];

                if (phase === 'DISPERSE') {
                    // Explode outward
                    p.x += p.vx * 15; // Fast speed
                    p.y += p.vy * 15;
                    p.life -= 2; // Die faster
                } else if (phase === 'HOLD') {
                    // Gentle float
                    p.x += Math.sin(Date.now() * 0.005 + p.wobble) * 0.5;
                    p.y += Math.cos(Date.now() * 0.005 + p.wobble) * 0.5;
                    // Pulse size
                    p.life -= 0.5; // Slowly fade
                } else {
                    // Writing phase: just sit there or drift slightly
                    p.life -= 1;
                }

                if (p.life <= 0) {
                    particles.splice(i, 1);
                    continue;
                }

                const opacity = p.life / p.maxLife;
                ctx.fillStyle = p.color;
                ctx.globalAlpha = opacity;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * opacity, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1.0;
        };

        // --- Animation Loop ---
        const render = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;

            // 1. WRITING PHASE
            if (elapsed < CONFIG.WRITING_DURATION) {
                const progress = elapsed / CONFIG.WRITING_DURATION; // 0 to 1
                const length = totalLength * progress;

                // Move "Pen" cursor
                // Get current point
                const point = pathEl.getPointAtLength(length);

                // Scale and center the path
                // Original path is roughly 300x200. Let's scale it up.
                const scale = Math.min(canvas.width, canvas.height) / 400;
                const offsetX = (canvas.width - 350 * scale) / 2;
                const offsetY = (canvas.height - 250 * scale) / 2;

                const cx = point.x * scale + offsetX;
                const cy = point.y * scale + offsetY;

                // Spawn Particles at Cursor
                // Gradient Color based on progress
                const colorTotal = CONFIG.COLORS.length;
                const colorIndex = Math.floor(progress * (colorTotal - 1));
                const colorNext = Math.min(colorIndex + 1, colorTotal - 1);
                // Simple color pick for now (could interpolate RGB properly but array pick is enough for style)
                const color = CONFIG.COLORS[Math.floor(progress * CONFIG.COLORS.length)] || CONFIG.COLORS[CONFIG.COLORS.length - 1];

                // Spawn multiple for density
                for (let k = 0; k < 5; k++) {
                    const jitter = 4 * scale;
                    particles.push(createParticle(
                        cx + (Math.random() - 0.5) * jitter,
                        cy + (Math.random() - 0.5) * jitter,
                        color,
                        0.5 // Low velocity
                    ));
                }

                // Draw a bright "head" for the pen
                ctx.shadowBlur = 20;
                ctx.shadowColor = "white";
                ctx.fillStyle = "#fff";
                ctx.beginPath();
                ctx.arc(cx, cy, 4 * scale, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;

            }
            // 2. HOLD PHASE
            else if (elapsed < CONFIG.WRITING_DURATION + CONFIG.HOLD_DURATION) {
                if (phase !== 'HOLD') phase = 'HOLD';

                // Add sparkle particles along the whole path occasionally to keep it alive
                if (Math.random() > 0.8) {
                    const randLen = Math.random() * totalLength;
                    const point = pathEl.getPointAtLength(randLen);
                    const scale = Math.min(canvas.width, canvas.height) / 400;
                    const offsetX = (canvas.width - 350 * scale) / 2;
                    const offsetY = (canvas.height - 250 * scale) / 2;
                    const cx = point.x * scale + offsetX;
                    const cy = point.y * scale + offsetY;
                    const color = CONFIG.COLORS[Math.floor(Math.random() * CONFIG.COLORS.length)];
                    particles.push(createParticle(cx, cy, color, 1));
                }
            }
            // 3. DISPERSE PHASE
            else if (elapsed < CONFIG.WRITING_DURATION + CONFIG.HOLD_DURATION + CONFIG.DISPERSE_DURATION) {
                if (phase !== 'DISPERSE') {
                    phase = 'DISPERSE';
                    setIsFading(true);

                    // Assign explosion velocities to all existing particles
                    particles.forEach(p => {
                        p.vx = (Math.random() - 0.5) * 2;
                        p.vy = (Math.random() - 0.5) * 2 - 1; // Slight upward bias
                        p.life = 30; // Reset life for fade out
                    });
                }
            }
            // 4. DONE
            else {
                onComplete();
                return;
            }

            drawParticles(elapsed);
            animationFrameId = requestAnimationFrame(render);
        };

        animationFrameId = requestAnimationFrame(render);

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [onComplete]);

    return (
        <div
            className={`fixed inset-0 z-[99999] bg-black flex items-center justify-center transition-opacity duration-1000 ${isFading ? 'opacity-0' : 'opacity-100'}`}
            style={{ pointerEvents: 'none' }} // Allow clicks to pass through if fading
        >
            <canvas ref={canvasRef} className="block" />
        </div>
    );
};
