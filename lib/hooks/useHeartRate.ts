'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

// Dynamically import HealthKit plugin only on iOS
let CapacitorHealthkit: any = null;

// Type definitions for heart rate data
interface HeartRateSample {
    value: number;
    startDate: string;
    endDate: string;
}

interface UseHeartRateReturn {
    /** Current BPM value */
    currentBPM: number | null;
    /** Array of recent heart rate values for graphing */
    heartRateHistory: number[];
    /** Whether monitoring is active */
    isMonitoring: boolean;
    /** Whether HealthKit is available and authorized */
    isAuthorized: boolean;
    /** Error message if any */
    error: string | null;
    /** Request HealthKit authorization */
    requestPermission: () => Promise<boolean>;
    /** Start heart rate monitoring */
    startMonitoring: () => void;
    /** Stop heart rate monitoring */
    stopMonitoring: () => void;
}

const MAX_HISTORY_LENGTH = 30; // Number of data points to keep for the graph
const POLL_INTERVAL_MS = 2000; // Poll every 2 seconds

export function useHeartRate(): UseHeartRateReturn {
    const [currentBPM, setCurrentBPM] = useState<number | null>(null);
    const [heartRateHistory, setHeartRateHistory] = useState<number[]>([]);
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lastQueryTimeRef = useRef<Date>(new Date());

    // Check if running on iOS
    const isNativeIOS = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

    // Lazy load HealthKit plugin
    useEffect(() => {
        if (isNativeIOS && !CapacitorHealthkit) {
            import('@perfood/capacitor-healthkit').then((module) => {
                CapacitorHealthkit = module.CapacitorHealthkit;
            }).catch((err) => {
                console.warn('Failed to load HealthKit plugin:', err);
            });
        }
    }, [isNativeIOS]);

    // Request HealthKit authorization
    const requestPermission = useCallback(async (): Promise<boolean> => {
        console.log('[HeartRate] requestPermission called, isNativeIOS:', isNativeIOS, 'plugin:', !!CapacitorHealthkit);

        if (!isNativeIOS) {
            console.log('[HeartRate] Not iOS, skipping');
            setError('HealthKit 仅在 iOS 设备上可用');
            return false;
        }

        if (!CapacitorHealthkit) {
            console.log('[HeartRate] Plugin not loaded');
            setError('HealthKit 插件未加载');
            return false;
        }

        try {
            // First check if HealthKit is available on this device
            console.log('[HeartRate] Checking HealthKit availability...');
            await CapacitorHealthkit.isAvailable();
            console.log('[HeartRate] HealthKit is available!');

            // Request read permission for heart rate
            console.log('[HeartRate] Requesting authorization...');
            await CapacitorHealthkit.requestAuthorization({
                all: [],
                read: ['heartRate'],
                write: [],
            });
            console.log('[HeartRate] Authorization granted!');

            setIsAuthorized(true);
            setError(null);
            return true;
        } catch (err: any) {
            console.error('[HeartRate] Authorization failed:', err, JSON.stringify(err));
            setError(err.message || '无法获取健康数据权限');
            setIsAuthorized(false);
            return false;
        }
    }, [isNativeIOS]);

    // Fetch the latest heart rate samples
    const fetchHeartRate = useCallback(async () => {
        console.log('[HeartRate] fetchHeartRate called, isAuthorized:', isAuthorized, 'plugin:', !!CapacitorHealthkit);
        if (!CapacitorHealthkit || !isAuthorized) {
            console.log('[HeartRate] Skipping fetch - not ready');
            return;
        }

        try {
            const now = new Date();
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000); // Look back 5 minutes

            console.log('[HeartRate] Querying HealthKit from', fiveMinutesAgo.toISOString(), 'to', now.toISOString());

            const result = await CapacitorHealthkit.queryHKitSampleType({
                sampleName: 'heartRate',
                startDate: fiveMinutesAgo.toISOString(),
                endDate: now.toISOString(),
                limit: 20,
            });

            console.log('[HeartRate] Query result:', JSON.stringify(result, null, 2));

            if (result && result.resultData && result.resultData.length > 0) {
                // Get the most recent heart rate value
                const samples: HeartRateSample[] = result.resultData;
                const latestSample = samples[samples.length - 1];
                const latestBPM = Math.round(latestSample.value);

                console.log('[HeartRate] Got BPM:', latestBPM);
                setCurrentBPM(latestBPM);

                // Add to history (maintaining max length)
                setHeartRateHistory((prev) => {
                    const newHistory = [...prev, latestBPM];
                    if (newHistory.length > MAX_HISTORY_LENGTH) {
                        return newHistory.slice(-MAX_HISTORY_LENGTH);
                    }
                    return newHistory;
                });

                lastQueryTimeRef.current = now;
                setError(null);
            } else {
                console.log('[HeartRate] No data returned from HealthKit');
            }
        } catch (err: any) {
            console.error('[HeartRate] Failed to fetch heart rate:', err);
            setError(err.message || '读取心率失败');
        }
    }, [isAuthorized]);

    // Start monitoring heart rate
    const startMonitoring = useCallback(() => {
        if (!isNativeIOS || !isAuthorized) {
            console.warn('Cannot start monitoring: not authorized or not iOS');
            return;
        }

        setIsMonitoring(true);
        setHeartRateHistory([]); // Reset history when starting

        // Initial fetch
        fetchHeartRate();

        // Set up polling
        pollIntervalRef.current = setInterval(() => {
            fetchHeartRate();
        }, POLL_INTERVAL_MS);
    }, [isNativeIOS, isAuthorized, fetchHeartRate]);

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
