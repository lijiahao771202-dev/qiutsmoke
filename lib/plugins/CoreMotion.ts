import { registerPlugin } from '@capacitor/core';

export interface CoreMotionPlugin {
    start(): Promise<{ status: string }>;
    stop(): Promise<{ status: string }>;
    addListener(
        eventName: 'accelUpdate',
        listenerFunc: (data: { x: number; y: number; z: number }) => void
    ): Promise<{ remove: () => Promise<void> }>;
}

const CoreMotion = registerPlugin<CoreMotionPlugin>('CoreMotion');

export { CoreMotion };
