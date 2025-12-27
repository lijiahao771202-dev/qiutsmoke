'use client';

/**
 * 全局音频解锁器
 * 
 * iOS Safari/PWA 要求音频必须在用户交互的同步调用栈内启动。
 * 此模块提供一个全局共享的 AudioContext，在用户首次点击时解锁，
 * 之后所有音频操作复用这个已解锁的 context。
 */

let sharedAudioContext: AudioContext | null = null;
let isUnlocked = false;

/**
 * 获取或创建共享的 AudioContext
 */
export function getSharedAudioContext(): AudioContext {
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
        sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return sharedAudioContext;
}

/**
 * 检查音频是否已解锁
 */
export function isAudioUnlocked(): boolean {
    return isUnlocked && sharedAudioContext?.state === 'running';
}

/**
 * 解锁音频 - 必须在用户交互的同步调用栈中调用！
 * 
 * 此函数会：
 * 1. 创建/获取共享 AudioContext
 * 2. 调用 resume() 解锁
 * 3. 播放一个静音的极短音频来"预热"音频管道
 * 
 * @returns Promise<boolean> 是否成功解锁
 */
export async function unlockAudio(): Promise<boolean> {
    try {
        const ctx = getSharedAudioContext();

        // Resume context (required for iOS)
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }

        // Play a silent buffer to "warm up" the audio pipeline
        // This is a well-known trick to ensure iOS actually allows audio
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);

        isUnlocked = true;
        console.log('[AudioUnlock] ✅ Audio unlocked, context state:', ctx.state);
        return true;
    } catch (e) {
        console.error('[AudioUnlock] ❌ Failed to unlock audio:', e);
        return false;
    }
}

/**
 * 使用共享 context 播放完成提示音
 * 由于使用已解锁的 context，可以在任何时候调用
 */
export function playCompletionSound(): void {
    try {
        const ctx = getSharedAudioContext();

        if (ctx.state === 'suspended') {
            console.warn('[AudioUnlock] Context is suspended, attempting resume...');
            ctx.resume();
        }

        const masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);
        masterGain.gain.value = 0.3;

        // 愉悦的大三和弦 C-E-G + 上行琶音
        const frequencies = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        const delays = [0, 0.08, 0.16, 0.24];

        frequencies.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;
            osc.connect(gain);
            gain.connect(masterGain);

            const startTime = ctx.currentTime + delays[i];
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.4, startTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.8);

            osc.start(startTime);
            osc.stop(startTime + 0.85);
        });

        console.log('[AudioUnlock] 🔔 Completion sound played');
    } catch (e) {
        console.warn('[AudioUnlock] Failed to play completion sound:', e);
    }
}

/**
 * 关闭共享 AudioContext（在页面卸载时调用）
 */
export function closeSharedAudioContext(): void {
    if (sharedAudioContext && sharedAudioContext.state !== 'closed') {
        sharedAudioContext.close();
        sharedAudioContext = null;
        isUnlocked = false;
    }
}
