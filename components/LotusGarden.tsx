"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Matter from "matter-js";
import { useHaptics } from "@/lib/hooks/useHaptics";
import { Motion } from "@capacitor/motion";

interface MeditationRecord {
    id: string;
    duration: number; // 分钟
    created_at: string;
}

interface LotusGardenProps {
    records: MeditationRecord[];
    className?: string;
}

// 根据时长计算莲花大小
function getLotusSize(duration: number): number {
    if (duration <= 5) return 28;
    if (duration <= 10) return 38;
    if (duration <= 20) return 50;
    return 65;
}

export function LotusGarden({ records, className = "" }: LotusGardenProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<Matter.Engine | null>(null);
    const runnerRef = useRef<Matter.Runner | null>(null);
    const lotusesRef = useRef<Matter.Body[]>([]);

    const { triggerLight, triggerMedium } = useHaptics();
    const [isInitialized, setIsInitialized] = useState(false);

    // 陀螺仪权限状态
    const [gyroEnabled, setGyroEnabled] = useState(false);
    const [needsPermission, setNeedsPermission] = useState(false);
    const listenerHandleRef = useRef<any>(null);

    // 绘制莲花
    const drawLotus = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // 莲花渐变
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
        gradient.addColorStop(0, "rgba(255, 182, 193, 0.95)"); // 粉色中心
        gradient.addColorStop(0.5, "rgba(221, 160, 221, 0.9)"); // 紫色
        gradient.addColorStop(1, "rgba(186, 85, 211, 0.85)"); // 深紫边缘

        // 绘制莲花花瓣（简化版 - 6 瓣）
        const petalCount = 6;
        const petalLength = size * 0.8;
        const petalWidth = size * 0.4;

        for (let i = 0; i < petalCount; i++) {
            const petalAngle = (i / petalCount) * Math.PI * 2;
            ctx.save();
            ctx.rotate(petalAngle);

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(
                petalWidth * 0.5, -petalLength * 0.3,
                petalWidth * 0.8, -petalLength * 0.7,
                0, -petalLength
            );
            ctx.bezierCurveTo(
                -petalWidth * 0.8, -petalLength * 0.7,
                -petalWidth * 0.5, -petalLength * 0.3,
                0, 0
            );

            ctx.fillStyle = gradient;
            ctx.fill();

            // 花瓣边缘光
            ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.restore();
        }

        // 莲花中心
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 215, 0, 0.9)"; // 金色中心
        ctx.fill();

        ctx.restore();
    }, []);

    // 初始化物理世界
    useEffect(() => {
        if (!containerRef.current || !canvasRef.current || records.length === 0) return;

        const container = containerRef.current;
        const canvas = canvasRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        canvas.width = width;
        canvas.height = height;

        // 创建引擎
        const engine = Matter.Engine.create({
            gravity: { x: 0, y: 0.5 }
        });
        engineRef.current = engine;

        // 创建边界墙壁
        const wallThickness = 50;
        const walls = [
            Matter.Bodies.rectangle(width / 2, height + wallThickness / 2, width, wallThickness, { isStatic: true, label: "wall" }),
            Matter.Bodies.rectangle(width / 2, -wallThickness / 2, width, wallThickness, { isStatic: true, label: "wall" }),
            Matter.Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height, { isStatic: true, label: "wall" }),
            Matter.Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height, { isStatic: true, label: "wall" }),
        ];
        Matter.Composite.add(engine.world, walls);

        // 创建莲花物体
        const lotuses: Matter.Body[] = [];
        records.forEach((record) => {
            const size = getLotusSize(record.duration);
            const x = Math.random() * (width - size * 2) + size;
            const y = Math.random() * (height * 0.5) + size;

            const lotus = Matter.Bodies.circle(x, y, size, {
                restitution: 0.6,
                friction: 0.1,
                frictionAir: 0.02,
                label: `lotus-${record.id}`,
            });

            (lotus as any).lotusSize = size;
            lotuses.push(lotus);
        });

        Matter.Composite.add(engine.world, lotuses);
        lotusesRef.current = lotuses;

        // 碰撞检测
        Matter.Events.on(engine, "collisionStart", (event) => {
            event.pairs.forEach((pair) => {
                const { bodyA, bodyB } = pair;
                if (bodyA.label.startsWith("lotus") && bodyB.label.startsWith("lotus")) {
                    triggerLight();
                } else if (
                    (bodyA.label.startsWith("lotus") && bodyB.label === "wall") ||
                    (bodyB.label.startsWith("lotus") && bodyA.label === "wall")
                ) {
                    triggerMedium();
                }
            });
        });

        // 创建 Runner
        const runner = Matter.Runner.create();
        runnerRef.current = runner;
        Matter.Runner.run(runner, engine);

        // 渲染循环
        const ctx = canvas.getContext("2d")!;
        let animationId: number;

        const render = () => {
            ctx.clearRect(0, 0, width, height);
            lotusesRef.current.forEach((lotus) => {
                const size = (lotus as any).lotusSize || 30;
                drawLotus(ctx, lotus.position.x, lotus.position.y, size, lotus.angle);
            });
            animationId = requestAnimationFrame(render);
        };
        render();

        setIsInitialized(true);
        setNeedsPermission(true);

        return () => {
            cancelAnimationFrame(animationId);
            if (runnerRef.current) Matter.Runner.stop(runnerRef.current);
            if (engineRef.current) Matter.Engine.clear(engineRef.current);
        };
    }, [records, drawLotus, triggerLight, triggerMedium]);

    // 请求陀螺仪权限并启动监听
    const requestGyroPermission = async () => {
        try {
            // 使用 Capacitor Motion 插件
            const handle = await Motion.addListener("accel", (event) => {
                if (!engineRef.current) return;
                const { x, y } = event.acceleration;
                if (x !== undefined && y !== undefined) {
                    engineRef.current.gravity.x = -x * 0.1;
                    engineRef.current.gravity.y = y * 0.1;
                }
            });

            listenerHandleRef.current = handle;
            setGyroEnabled(true);
            setNeedsPermission(false);
            triggerLight();
        } catch (e) {
            console.error("Capacitor Motion failed, trying native:", e);
            // 回退到原生 DeviceMotionEvent
            try {
                if (typeof (DeviceMotionEvent as any).requestPermission === "function") {
                    const response = await (DeviceMotionEvent as any).requestPermission();
                    if (response === "granted") {
                        setGyroEnabled(true);
                        setNeedsPermission(false);
                    }
                } else {
                    setGyroEnabled(true);
                    setNeedsPermission(false);
                }
            } catch (e2) {
                console.error("Fallback also failed:", e2);
            }
        }
    };

    // 原生 DeviceMotion 回退
    useEffect(() => {
        if (!isInitialized || !engineRef.current || !gyroEnabled || listenerHandleRef.current) return;

        const handleDeviceMotion = (event: DeviceMotionEvent) => {
            const { accelerationIncludingGravity } = event;
            if (!accelerationIncludingGravity || !engineRef.current) return;
            const { x, y } = accelerationIncludingGravity;
            if (x !== null && y !== null) {
                engineRef.current.gravity.x = -x * 0.1;
                engineRef.current.gravity.y = y * 0.1;
            }
        };

        window.addEventListener("devicemotion", handleDeviceMotion);
        return () => window.removeEventListener("devicemotion", handleDeviceMotion);
    }, [isInitialized, gyroEnabled]);

    // 清理 Capacitor 监听器
    useEffect(() => {
        return () => {
            if (listenerHandleRef.current) listenerHandleRef.current.remove();
        };
    }, []);

    if (records.length === 0) return null;

    return (
        <div
            ref={containerRef}
            className={`fixed inset-0 z-0 pointer-events-auto ${className}`}
            style={{ touchAction: "none" }}
        >
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

            <div className="absolute top-[calc(env(safe-area-inset-top)+4.5rem)] left-4 flex items-center gap-2 pointer-events-auto">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white/70 text-xs">
                    <span>🪷</span>
                    <span>{records.length}</span>
                </div>

                {needsPermission && !gyroEnabled && (
                    <button
                        onClick={requestGyroPermission}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-500/20 backdrop-blur-md text-pink-300 text-xs border border-pink-500/30 active:scale-95 transition-all"
                    >
                        <span>📱</span>
                        <span>启用陀螺仪</span>
                    </button>
                )}

                {gyroEnabled && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/20 backdrop-blur-md text-green-300 text-xs">
                        <span>✓</span>
                        <span>已启用</span>
                    </div>
                )}
            </div>
        </div>
    );
}
