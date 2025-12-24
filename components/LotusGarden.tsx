"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
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

    // Debug 状态
    const [debugInfo, setDebugInfo] = useState<{ x: number, y: number, source: string }>({ x: 0, y: 0, source: 'none' });

    // Portal Mounting State
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

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
        if (!containerRef.current || !canvasRef.current) return;

        // 🔥 Mock 数据：如果没有记录，使用 3 个测试莲花
        const activeRecords = records.length > 0 ? records : [
            { id: 'mock-1', duration: 5, created_at: '' },
            { id: 'mock-2', duration: 15, created_at: '' },
            { id: 'mock-3', duration: 30, created_at: '' }
        ];

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
        activeRecords.forEach((record) => {
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
            console.log("Starting permission request flow...");

            // 🔥 优先尝试 Native API (针对 iOS Safari/WebView)
            // iOS 13+ 需要用户交互触发 DeviceMotionEvent.requestPermission
            const DeviceMotionEventAny = window.DeviceMotionEvent as any;

            if (typeof DeviceMotionEventAny !== 'undefined' && typeof DeviceMotionEventAny.requestPermission === 'function') {
                console.log("Detected iOS Native Permission API. Requesting...");
                const permissionState = await DeviceMotionEventAny.requestPermission();

                if (permissionState === 'granted') {
                    console.log("Native Permission GRANTED!");
                    setupNativeListener();
                    setGyroEnabled(true);
                    setNeedsPermission(false);
                    triggerLight();
                    return; // 成功后直接返回，不走 Capacitor
                } else {
                    console.warn("Native Permission DENIED:", permissionState);
                    alert(`权限被拒绝: ${permissionState}`);
                    return; // 拒绝后停止
                }
            }

            // 非 iOS 或 旧版 iOS，尝试 Capacitor (或直接监听)
            console.log("Falling back to Capacitor Motion / Standard Event...");
            try {
                // 尝试 Capacitor Motion
                const handle = await Motion.addListener("accel", (event) => {
                    handleMotionData(event.accelerationIncludingGravity, 'capacitor');
                });
                listenerHandleRef.current = handle;
                setGyroEnabled(true);
                setNeedsPermission(false);
                triggerLight();
            } catch (capError) {
                console.error("Capacitor Motion failed:", capError);
                // 最后的尝试：直接添加原生监听 (非 iOS 13+ 环境，如 Android WebView 或 PC)
                setupNativeListener();
                setGyroEnabled(true);
                setNeedsPermission(false);
            }

        } catch (e) {
            console.error("Helper Error:", e);
            alert("启动陀螺仪失败: " + String(e));
        }
    };

    const setupNativeListener = () => {
        const handleDeviceMotion = (event: DeviceMotionEvent) => {
            handleMotionData(event.accelerationIncludingGravity, 'native');
        };
        window.addEventListener("devicemotion", handleDeviceMotion);
        // 保存引用以便清理 (简化起见暂作为一个全局监听，react useEffect 会负责 remove 旧的如果重新挂载，
        // 但这里我们是在点击事件里加的。为了防止重复，应该由 useEffect 管理，或者只设置状态让 useEffect 挂载)
        // 实际上最佳实践是：requestPermission 只负责拿权限，拿到了设状态，监听由 useEffect 负责。
    };

    // 统一处理数据
    const handleMotionData = (accel: { x: number | null, y: number | null, z: number | null } | null | undefined, src: string) => {
        if (!accel || !engineRef.current) return;
        const { x, y } = accel;

        setDebugInfo({ x: x || 0, y: y || 0, source: src });

        if (x !== null && y !== null && x !== undefined && y !== undefined) {
            // 修正方向：
            // X轴: 手机右倾(x>0) -> 物体向右(gravity.x>0) -> 即 x
            // Y轴: 手机竖立(y<0) -> 物体向下(gravity.y>0) -> 即 -y
            engineRef.current.gravity.x = x * 0.1;
            engineRef.current.gravity.y = -y * 0.1;
        }
    };

    // 监听 Native API (如果已授权)
    useEffect(() => {
        if (!isInitialized || !engineRef.current || !gyroEnabled) return;

        // 避免重复监听 Capacitor (如果已经是 Capacitor 驱动则不添加 Native)
        // 这里简化逻辑：总是添加 Native 监听作为兜底，反正逻辑是一样的
        const onMotion = (e: DeviceMotionEvent) => {
            // 只有当 Capacitor 没送数据时才处理？或者覆盖？
            // 简单起见，覆盖更新。
            handleMotionData(e.accelerationIncludingGravity, 'native-event');
        };

        window.addEventListener("devicemotion", onMotion);
        return () => window.removeEventListener("devicemotion", onMotion);
    }, [isInitialized, gyroEnabled]);


    // 清理 Capacitor 监听器
    useEffect(() => {
        return () => {
            if (listenerHandleRef.current) {
                listenerHandleRef.current.remove();
            }
        };
    }, []);

    // 控制面板 (通过 Portal 渲染到 Body，确保层级最高)
    const controls = (
        <div className="fixed top-[calc(env(safe-area-inset-top)+4.5rem)] left-4 flex flex-col gap-2 pointer-events-auto items-start z-[9999]">
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white/70 text-xs shadow-sm">
                    <span>🪷</span>
                    <span>{records.length > 0 ? records.length : "Demo"}</span>
                </div>

                {needsPermission && !gyroEnabled && (
                    <button
                        onClick={requestGyroPermission}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-500/20 backdrop-blur-md text-pink-300 text-xs border border-pink-500/30 hover:bg-pink-500/30 active:scale-95 transition-all shadow-lg"
                    >
                        <span>📱</span>
                        <span>启用陀螺仪</span>
                    </button>
                )}

                {gyroEnabled && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/20 backdrop-blur-md text-green-300 text-xs shadow-lg shadow-green-500/10">
                        <span>✓</span>
                        <span>已启用</span>
                    </div>
                )}
            </div>

            {/* 调试信息 HUD - 发布时可隐藏 */}
            <div className="px-3 py-2 rounded-lg bg-black/60 backdrop-blur-md text-white/70 text-[10px] space-y-1 border border-white/10 pointer-events-none">
                <div className="flex justify-between w-24"><span>Src:</span> <span className="text-cyan-300">{debugInfo.source}</span></div>
                <div className="flex justify-between w-24"><span>X:</span> <span className="font-mono">{debugInfo.x.toFixed(2)}</span></div>
                <div className="flex justify-between w-24"><span>Y:</span> <span className="font-mono">{debugInfo.y.toFixed(2)}</span></div>
                {!gyroEnabled && <div className="text-orange-400 mt-1">⚠️ 陀螺仪未启用</div>}
            </div>
        </div>
    );

    return (
        <>
            {/* 背景 Canvas */}
            <div
                ref={containerRef}
                className={`fixed inset-0 z-0 pointer-events-auto ${className}`}
                style={{ touchAction: "none" }}
            >
                <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            </div>

            {/* 前景控制面板 */}
            {mounted && typeof document !== 'undefined' && createPortal(controls, document.body)}
        </>
    );
}
