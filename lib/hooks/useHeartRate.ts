import { useState, useRef, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

let CapacitorHealthkit: any = null;

interface HeartRateSample {
    value: number;
    startDate: string;
    endDate: string;
}

interface UseHeartRateReturn {
    currentBPM: number | null;
    heartRateHistory: number[];
    isMonitoring: boolean;
    isAuthorized: boolean;
    error: string | null;
    requestPermission: () => Promise<boolean>;
    startMonitoring: (forceAuthorized?: boolean) => void;
    stopMonitoring: () => void;
}

const MAX_HISTORY_LENGTH = 30;
const POLL_INTERVAL_MS = 2000;

export function useHeartRate(): UseHeartRateReturn {
    const [currentBPM, setCurrentBPM] = useState<number | null>(null);
    const [heartRateHistory, setHeartRateHistory] = useState<number[]>([]);
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastQueryTimeRef = useRef<Date>(new Date());
    const isAuthorizedRef = useRef(false);

    const isNativeIOS = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

    // Load HealthKit plugin dynamically
    useEffect(() => {
        if (isNativeIOS && !CapacitorHealthkit) {
            import('@perfood/capacitor-healthkit').then((module) => {
                CapacitorHealthkit = module.CapacitorHealthkit;
            }).catch(() => { });
        }
    }, [isNativeIOS]);

    // Fetch the latest heart rate samples
    const fetchHeartRate = useCallback(async () => {
        if (!CapacitorHealthkit || !isAuthorizedRef.current) return;

        try {
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

            const result = await CapacitorHealthkit.queryHKitSampleType({
                sampleName: 'heartRate',
                startDate: fiveMinutesAgo.toISOString(),
                endDate: now.toISOString(),
                limit: 20,
            });

            if (result && result.resultData && result.resultData.length > 0) {
                const samples: HeartRateSample[] = result.resultData;
                const latestSample = samples[samples.length - 1];
                const latestBPM = Math.round(latestSample.value);

                setCurrentBPM(latestBPM);
                setHeartRateHistory((prev) => {
                    const newHistory = [...prev, latestBPM];
                    if (newHistory.length > MAX_HISTORY_LENGTH) {
                        return newHistory.slice(-MAX_HISTORY_LENGTH);
                    }
                    return newHistory;
                });

                lastQueryTimeRef.current = now;
                setError(null);
            }
        } catch (err: any) {
            setError(err.message || '读取心率失败');
        }
    }, []);

    // Request HealthKit authorization
    const requestPermission = useCallback(async (): Promise<boolean> => {
        if (!isNativeIOS || !CapacitorHealthkit) {
            setError('HealthKit 仅在 iOS 设备上可用');
            return false;
        }

        try {
            await CapacitorHealthkit.isAvailable();
            await CapacitorHealthkit.requestAuthorization({
                all: [],
                read: ['heartRate'],
                write: [],
            });

            setIsAuthorized(true);
            isAuthorizedRef.current = true;
            setError(null);
            return true;
        } catch (err: any) {
            setError(err.message || '无法获取健康数据权限');
            setIsAuthorized(false);
            isAuthorizedRef.current = false;
            return false;
        }
    }, [isNativeIOS]);

    // Start monitoring heart rate
    const startMonitoring = useCallback((forceAuthorized = false) => {
        if (!isNativeIOS) return;

        // Use ref or forceAuthorized to avoid React state timing issues
        if (!isAuthorizedRef.current && !forceAuthorized) return;

        setIsMonitoring(true);
        setHeartRateHistory([]);

        // Initial fetch
        fetchHeartRate();

        // Set up polling
        pollIntervalRef.current = setInterval(() => {
            fetchHeartRate();
        }, POLL_INTERVAL_MS);
    }, [isNativeIOS, fetchHeartRate]);

    // Stop monitoring heart rate
    const stopMonitoring = useCallback(() => {
        setIsMonitoring(false);

        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, []);

    return {
        currentBPM,
        heartRateHistory,
        isMonitoring,
        isAuthorized,
        error,
        requestPermission,
        startMonitoring,
        stopMonitoring,
    };
}
