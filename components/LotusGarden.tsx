"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Matter from "matter-js";
import { useHaptics } from "@/lib/hooks/useHaptics";

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
    const renderRef = useRef<Matter.Render | null>(null);
    const runnerRef = useRef<Matter.Runner | null>(null);
    const lotusesRef = useRef<Matter.Body[]>([]);

    const { triggerLight, triggerMedium } = useHaptics();
    const [isInitialized, setIsInitialized] = useState(false);

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
            // 底部
            Matter.Bodies.rectangle(width / 2, height + wallThickness / 2, width, wallThickness, { isStatic: true, label: "wall" }),
            // 顶部
            Matter.Bodies.rectangle(width / 2, -wallThickness / 2, width, wallThickness, { isStatic: true, label: "wall" }),
            // 左侧
            Matter.Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height, { isStatic: true, label: "wall" }),
            // 右侧
            Matter.Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height, { isStatic: true, label: "wall" }),
        ];
        Matter.Composite.add(engine.world, walls);

        // 创建莲花物体
        const lotuses: Matter.Body[] = [];
        records.forEach((record, index) => {
            const size = getLotusSize(record.duration);
            const x = Math.random() * (width - size * 2) + size;
            const y = Math.random() * (height * 0.5) + size;

            const lotus = Matter.Bodies.circle(x, y, size, {
                restitution: 0.6, // 弹性
                friction: 0.1,
                frictionAir: 0.02,
                label: `lotus-${record.id}`,
                render: {
                    visible: false // 我们自己绘制
                }
            });

            // 存储大小信息
            (lotus as any).lotusSize = size;
            (lotus as any).recordId = record.id;

            lotuses.push(lotus);
        });

        Matter.Composite.add(engine.world, lotuses);
        lotusesRef.current = lotuses;

        // 碰撞检测
        Matter.Events.on(engine, "collisionStart", (event) => {
            event.pairs.forEach((pair) => {
                const { bodyA, bodyB } = pair;

                // 莲花之间碰撞
                if (bodyA.label.startsWith("lotus") && bodyB.label.startsWith("lotus")) {
                    triggerLight();
                }
                // 莲花撞墙
                else if (
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

        // 自定义渲染循环
        const ctx = canvas.getContext("2d")!;
        let animationId: number;

        const render = () => {
            ctx.clearRect(0, 0, width, height);

            // 绘制所有莲花
            lotusesRef.current.forEach((lotus) => {
                const size = (lotus as any).lotusSize || 30;
                drawLotus(ctx, lotus.position.x, lotus.position.y, size, lotus.angle);
            });

            animationId = requestAnimationFrame(render);
        };
        render();

        setIsInitialized(true);

        // 清理
        return () => {
            cancelAnimationFrame(animationId);
            if (runnerRef.current) {
                Matter.Runner.stop(runnerRef.current);
            }
            if (engineRef.current) {
                Matter.Engine.clear(engineRef.current);
            }
        };
    }, [records, drawLotus, triggerLight, triggerMedium]);

    // 陀螺仪权限状态
    const [gyroEnabled, setGyroEnabled] = useState(false);
    const [needsPermission, setNeedsPermission] = useState(false);

    // 请求陀螺仪权限（需要用户点击触发）
    const requestGyroPermission = async () => {
        if (typeof (DeviceMotionEvent as any).requestPermission === "function") {
            try {
                const response = await (DeviceMotionEvent as any).requestPermission();
                if (response === "granted") {
                    setGyroEnabled(true);
                    setNeedsPermission(false);
                }
            } catch (e) {
                console.error("Gyro permission denied:", e);
            }
        } else {
            // 非 iOS 设备直接启用
            setGyroEnabled(true);
            setNeedsPermission(false);
        }
    };

    // 检查是否需要权限
    useEffect(() => {
        if (!isInitialized) return;

        if (typeof (DeviceMotionEvent as any).requestPermission === "function") {
            // iOS 需要权限
            setNeedsPermission(true);
        } else {
            // 其他设备直接启用
            setGyroEnabled(true);
        }
    }, [isInitialized]);

    // 陀螺仪控制重力
    useEffect(() => {
        if (!isInitialized || !engineRef.current || !gyroEnabled) return;

        const handleDeviceMotion = (event: DeviceMotionEvent) => {
            const { accelerationIncludingGravity } = event;
            if (!accelerationIncludingGravity || !engineRef.current) return;

            const { x, y } = accelerationIncludingGravity;
            if (x !== null && y !== null) {
                // 调整重力方向（移动设备坐标系）
                engineRef.current.gravity.x = -x * 0.1;
                engineRef.current.gravity.y = y * 0.1;
            }
        };

        window.addEventListener("devicemotion", handleDeviceMotion);

        return () => {
            window.removeEventListener("devicemotion", handleDeviceMotion);
        };
    }, [isInitialized, gyroEnabled]);

    if (records.length === 0) {
        return null;
    }

    return (
        <div
            ref={containerRef}
            className={`fixed inset-0 z-0 pointer-events-auto ${className}`}
            style={{ touchAction: "none" }}
        >
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
            />

            {/* 莲花数量指示器 + 陀螺仪启用按钮 */}
            <div className="absolute top-[calc(env(safe-area-inset-top)+4.5rem)] left-4 flex items-center gap-2 pointer-events-auto">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white/70 text-xs">
                    <span>🪷</span>
                    <span>{records.length}</span>
                </div>

                {needsPermission && !gyroEnabled && (
                    <button
                        onClick={requestGyroPermission}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-500/20 backdrop-blur-md text-pink-300 text-xs border border-pink-500/30 hover:bg-pink-500/30 transition-colors"
                    >
                        <span>📱</span>
                        <span>启用陀螺仪</span>
                    </button>
                )}
            </div>
        </div>
    );
}

