"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Matter from "matter-js";
import { useHaptics } from "@/lib/hooks/useHaptics";
import { CoreMotion } from "@/lib/plugins/CoreMotion";

interface MeditationRecord {
    id: string;
    duration: number; // 分钟
    created_at: string;
}

interface LotusGardenProps {
    records: MeditationRecord[];
    className?: string;
    streakDays?: number; // 连续打卡天数
}

// 莲花稀有度类型
type LotusRarity = 'common' | 'rare' | 'epic' | 'legendary';

// 根据时长计算莲花大小
function getLotusSize(duration: number): number {
    if (duration <= 5) return 28;
    if (duration <= 10) return 38;
    if (duration <= 20) return 50;
    if (duration <= 30) return 60;
    return 70; // 超过30分钟
}

// 根据连续天数和索引判断稀有度
function getLotusRarity(index: number, totalCount: number, streakDays: number): LotusRarity {
    // 第一朵莲花 = 最新的冥想记录
    if (index === 0 && streakDays >= 7) return 'legendary'; // 7天连续 = 传说
    if (index === 0 && streakDays >= 3) return 'epic';       // 3天连续 = 史诗
    if (index < Math.min(3, totalCount) && streakDays >= 1) return 'rare'; // 最近3朵 = 稀有
    return 'common';
}

// 根据稀有度获取颜色方案
function getRarityColors(rarity: LotusRarity) {
    switch (rarity) {
        case 'legendary':
            return {
                glow: 'rgba(255, 215, 0, 0.4)',      // 金色光晕
                petalBase: 'rgba(255, 223, 0, 0.2)',
                petalMid: 'rgba(255, 215, 0, 0.5)',
                petalTip: 'rgba(255, 180, 0, 0.7)',
                core: 'rgba(255, 255, 255, 1)',
                coreGlow: 'rgba(255, 215, 0, 1)'
            };
        case 'epic':
            return {
                glow: 'rgba(147, 112, 219, 0.3)',   // 紫色光晕
                petalBase: 'rgba(200, 162, 255, 0.2)',
                petalMid: 'rgba(147, 112, 219, 0.5)',
                petalTip: 'rgba(106, 90, 205, 0.7)',
                core: 'rgba(255, 255, 255, 0.95)',
                coreGlow: 'rgba(186, 85, 211, 0.9)'
            };
        case 'rare':
            return {
                glow: 'rgba(135, 206, 250, 0.3)',   // 蓝色光晕
                petalBase: 'rgba(173, 216, 230, 0.2)',
                petalMid: 'rgba(135, 206, 250, 0.5)',
                petalTip: 'rgba(100, 149, 237, 0.7)',
                core: 'rgba(255, 255, 255, 0.95)',
                coreGlow: 'rgba(135, 206, 250, 0.9)'
            };
        default: // common
            return {
                glow: 'rgba(255, 182, 193, 0.2)',   // 粉色光晕
                petalBase: 'rgba(255, 255, 255, 0.15)',
                petalMid: 'rgba(255, 192, 203, 0.4)',
                petalTip: 'rgba(221, 160, 221, 0.6)',
                core: 'rgba(255, 255, 255, 0.9)',
                coreGlow: 'rgba(255, 215, 0, 0.8)'
            };
    }
}

export function LotusGarden({ records, className = "", streakDays = 0 }: LotusGardenProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<Matter.Engine | null>(null);
    const runnerRef = useRef<Matter.Runner | null>(null);
    const lotusesRef = useRef<Matter.Body[]>([]);

    // 🔒 Track which records have been initialized to prevent re-creation
    const initializedRecordIdsRef = useRef<Set<string>>(new Set());

    const { triggerLight, triggerMedium } = useHaptics();
    const [isInitialized, setIsInitialized] = useState(false);

    // 陀螺仪权限状态
    const [gyroEnabled, setGyroEnabled] = useState(false);
    const [needsPermission, setNeedsPermission] = useState(false);
    const listenerHandleRef = useRef<any>(null);

    // Debug 状态 (保留供调试用，但不显示)
    const [debugInfo, setDebugInfo] = useState<{ x: number, y: number, source: string }>({ x: 0, y: 0, source: 'none' });

    // 入场动画状态
    const [entranceProgress, setEntranceProgress] = useState<Record<string, number>>({});

    // Portal Mounting State
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    // 绘制水晶质感莲花 (支持不同稀有度颜色)
    const drawLotus = useCallback((
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        size: number,
        angle: number,
        rarity: LotusRarity = 'common',
        alpha: number = 1,
        time: number = Date.now()
    ) => {
        const colors = getRarityColors(rarity);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x, y);
        ctx.rotate(angle);

        // 🌟 稀有莲花专属：脉动光晕效果
        if (rarity !== 'common') {
            const pulsePhase = (Math.sin(time / (rarity === 'legendary' ? 500 : 800)) + 1) / 2;
            const glowSize = size * (1.8 + pulsePhase * 0.4);
            const glowAlpha = 0.15 + pulsePhase * 0.1;

            const pulse = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);

            if (rarity === 'legendary') {
                // 传说级：金色脉动光晕
                pulse.addColorStop(0, `rgba(255, 215, 0, ${glowAlpha})`);
                pulse.addColorStop(0.5, `rgba(255, 180, 0, ${glowAlpha * 0.5})`);
                pulse.addColorStop(1, 'rgba(255, 150, 0, 0)');
            } else if (rarity === 'epic') {
                // 史诗级：紫色脉动光晕
                pulse.addColorStop(0, `rgba(186, 85, 211, ${glowAlpha})`);
                pulse.addColorStop(0.5, `rgba(147, 112, 219, ${glowAlpha * 0.5})`);
                pulse.addColorStop(1, 'rgba(138, 43, 226, 0)');
            } else {
                // 稀有级：蓝色脉动光晕
                pulse.addColorStop(0, `rgba(135, 206, 250, ${glowAlpha * 0.8})`);
                pulse.addColorStop(1, 'rgba(100, 149, 237, 0)');
            }

            ctx.fillStyle = pulse;
            ctx.beginPath();
            ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
            ctx.fill();
        }

        // 1. 底层环境光晕 (Ambient Glow) - 使用稀有度颜色
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.5);
        glow.addColorStop(0, colors.glow);
        glow.addColorStop(1, colors.glow.replace(/[\d.]+\)$/, '0)'));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, size * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // 2. 绘制花瓣 (6 瓣)
        const petalCount = 6;
        const petalLength = size * 0.9;
        const petalWidth = size * 0.45;

        for (let i = 0; i < petalCount; i++) {
            const petalAngle = (i / petalCount) * Math.PI * 2;
            ctx.save();
            ctx.rotate(petalAngle);

            // 花瓣本体路径
            const drawPetalPath = () => {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.bezierCurveTo(petalWidth * 0.6, -petalLength * 0.3, petalWidth, -petalLength * 0.7, 0, -petalLength);
                ctx.bezierCurveTo(-petalWidth, -petalLength * 0.7, -petalWidth * 0.6, -petalLength * 0.3, 0, 0);
                ctx.closePath();
            };

            // A. 花瓣玻璃质感 (Glassy Base) - 使用稀有度颜色
            const glassGradient = ctx.createLinearGradient(0, 0, 0, -petalLength);
            glassGradient.addColorStop(0, colors.petalBase);
            glassGradient.addColorStop(0.5, colors.petalMid);
            glassGradient.addColorStop(1, colors.petalTip);

            drawPetalPath();
            ctx.fillStyle = glassGradient;
            ctx.fill();

            // B. 内部折射/深度效果 (Refraction/Depth)
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -petalLength * 0.8);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // C. 边缘光 (Edge Lighting)
            ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
            ctx.lineWidth = 0.5;
            ctx.stroke();

            // D. 尖端高光点 (Sharp Highlights)
            ctx.beginPath();
            ctx.arc(0, -petalLength * 0.95, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = "white";
            ctx.shadowBlur = 4;
            ctx.shadowColor = "white";
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.restore();
        }

        // 3. 水晶核心 (Crystal Core) - 使用稀有度颜色
        // 核心外圈
        const coreOuter = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.25);
        coreOuter.addColorStop(0, colors.coreGlow);
        coreOuter.addColorStop(1, colors.coreGlow.replace(/[\d.]+\)$/, '0)'));
        ctx.fillStyle = coreOuter;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.25, 0, Math.PI * 2);
        ctx.fill();

        // 核心本体 (锐利水晶点)
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.12, 0, Math.PI * 2);
        ctx.fillStyle = colors.core;
        ctx.shadowBlur = 10;
        ctx.shadowColor = colors.coreGlow;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();
    }, []);

    // 初始化物理世界 - 只在首次挂载时运行
    useEffect(() => {
        if (!containerRef.current || !canvasRef.current) return;
        // 🔒 If already initialized, skip (prevents re-init on hot reload or re-render)
        if (engineRef.current) return;

        const activeRecords = records;
        if (activeRecords.length === 0) return; // Wait for actual data

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

        // 创建莲花物体 (带稀有度)
        const lotuses: Matter.Body[] = [];
        const totalCount = activeRecords.length;

        activeRecords.forEach((record, index) => {
            // 🔒 Mark as initialized
            initializedRecordIdsRef.current.add(record.id);

            const size = getLotusSize(record.duration);
            const rarity = getLotusRarity(index, totalCount, streakDays);
            const x = Math.random() * (width - size * 2) + size;

            // 入场位置：从屏幕上方开始，让它们飘落
            const startY = size + Math.random() * (height * 0.3);

            const lotus = Matter.Bodies.circle(x, startY, size, {
                restitution: 0.6,
                friction: 0.1,
                frictionAir: 0.03, // 增加空气阻力，让飘落更慢
                label: `lotus-${record.id}`,
            });

            // 存储莲花元数据
            (lotus as any).lotusSize = size;
            (lotus as any).lotusRarity = rarity;
            (lotus as any).lotusIndex = index;
            (lotus as any).entranceDelay = index * 200; // 每朵花延迟200ms出现
            (lotus as any).hasEntered = false; // 标记是否已开始入场

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

        // 渲染循环 (带入场动画)
        const ctx = canvas.getContext("2d")!;
        let animationId: number;
        const startTime = Date.now();

        const render = () => {
            const now = Date.now();
            ctx.clearRect(0, 0, width, height);

            lotusesRef.current.forEach((lotus) => {
                const size = (lotus as any).lotusSize || 30;
                const rarity: LotusRarity = (lotus as any).lotusRarity || 'common';

                // 直接绘制所有莲花 (物理引擎处理下落)
                drawLotus(ctx, lotus.position.x, lotus.position.y, size, lotus.angle, rarity, 1, now);
            });

            animationId = requestAnimationFrame(render);
        };
        render();

        setIsInitialized(true);

        return () => {
            cancelAnimationFrame(animationId);
            if (runnerRef.current) Matter.Runner.stop(runnerRef.current);
            if (engineRef.current) Matter.Engine.clear(engineRef.current);
            engineRef.current = null; // Reset for potential remount
            initializedRecordIdsRef.current.clear();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // 🔒 Empty dependency array - initialize only once on mount

    // (陀螺仪自动启用逻辑已移动到下面的 Capacitor Motion useEffect 中)

    // 用户点击按钮请求 iOS 权限
    const requestGyroPermission = async () => {
        try {
            const DeviceMotionEventAny = window.DeviceMotionEvent as any;

            if (typeof DeviceMotionEventAny.requestPermission === 'function') {
                const permissionState = await DeviceMotionEventAny.requestPermission();

                if (permissionState === 'granted') {
                    localStorage.setItem('gyroPermissionGranted', 'true');
                    setupNativeListener();
                    setGyroEnabled(true);
                    setNeedsPermission(false);
                    triggerLight();
                } else {
                    // 权限被拒绝，隐藏按钮，不弹窗打扰用户
                    setNeedsPermission(false);
                    console.warn("Gyro permission denied");
                }
            }
        } catch (e) {
            console.error("Gyro permission error:", e);
            setNeedsPermission(false);
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

    // 使用原生 CoreMotion API - 自动启动，无需用户授权
    useEffect(() => {
        if (!isInitialized || !engineRef.current) return;

        let listenerHandle: { remove: () => Promise<void> } | null = null;

        const startMotion = async () => {
            try {
                console.log('[LotusGarden] Starting native CoreMotion...');

                // 1. 先添加事件监听器
                listenerHandle = await CoreMotion.addListener('accelUpdate', (data) => {
                    if (!engineRef.current) return;

                    const { x, y } = data;
                    engineRef.current.gravity.x = x * 0.1;
                    engineRef.current.gravity.y = -y * 0.1;
                    setDebugInfo({ x, y, source: 'native' });
                    setGyroEnabled(true);
                    setNeedsPermission(false);
                });

                // 2. 启动加速计
                await CoreMotion.start();

                listenerHandleRef.current = listenerHandle;
                console.log('[LotusGarden] Native CoreMotion started successfully');
                setGyroEnabled(true);
                setNeedsPermission(false);

            } catch (error) {
                console.log('[LotusGarden] Native CoreMotion failed, trying web fallback:', error);

                // 原生失败，尝试 Web API（需要用户授权）
                const DeviceMotionEventAny = window.DeviceMotionEvent as any;
                if (typeof DeviceMotionEventAny?.requestPermission === 'function') {
                    // iOS WebView - 需要用户点击
                    setNeedsPermission(true);
                } else {
                    // 非 iOS - 直接监听
                    const onMotion = (e: DeviceMotionEvent) => {
                        const accel = e.accelerationIncludingGravity;
                        if (!accel || !engineRef.current) return;

                        const { x, y } = accel;
                        if (x !== null && y !== null) {
                            engineRef.current.gravity.x = x * 0.1;
                            engineRef.current.gravity.y = -y * 0.1;
                            setDebugInfo({ x, y, source: 'web' });
                            setGyroEnabled(true);
                        }
                    };
                    window.addEventListener('devicemotion', onMotion);
                    setGyroEnabled(true);
                    setNeedsPermission(false);
                }
            }
        };

        startMotion();

        return () => {
            if (listenerHandleRef.current) {
                listenerHandleRef.current.remove();
                listenerHandleRef.current = null;
            }
            // 停止原生加速计
            CoreMotion.stop().catch(() => { });
        };
    }, [isInitialized]);


    // 清理 Capacitor 监听器
    useEffect(() => {
        return () => {
            if (listenerHandleRef.current) {
                listenerHandleRef.current.remove();
            }
        };
    }, []);

    // 控制面板 - 显示莲花数量和连续天数
    const controls = (
        <div className="fixed top-[calc(env(safe-area-inset-top)+4.5rem)] left-4 pointer-events-none z-[9999]">
            <div className="flex items-center gap-2">
                {/* 莲花计数 */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white/70 text-xs shadow-sm">
                    <span>🪷</span>
                    <span>{records.length > 0 ? records.length : "0"}</span>
                </div>

                {/* 连续打卡徽章 */}
                {streakDays >= 3 && (
                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full backdrop-blur-md text-xs ${streakDays >= 7
                        ? 'bg-gradient-to-r from-yellow-500/30 to-orange-500/30 text-yellow-200 border border-yellow-400/30'
                        : 'bg-purple-500/20 text-purple-200 border border-purple-400/30'
                        }`}>
                        <span>{streakDays >= 7 ? '🔥' : '⚡'}</span>
                        <span>{streakDays}天</span>
                    </div>
                )}
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
