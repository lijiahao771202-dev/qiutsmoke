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
const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds

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
        if (!isNativeIOS) {
            setError('HealthKit 仅在 iOS 设备上可用');
            return false;
        }

        if (!CapacitorHealthkit) {
            setError('HealthKit 插件未加载');
            return false;
        }

        try {
            // Request read permission for heart rate
            await CapacitorHealthkit.requestAuthorization({
                all: [],
                read: ['heartRate'],
                write: [],
            });

            setIsAuthorized(true);
            setError(null);
            return true;
        } catch (err: any) {
            console.error('HealthKit authorization failed:', err);
            setError(err.message || '无法获取健康数据权限');
            setIsAuthorized(false);
            return false;
        }
    }, [isNativeIOS]);

    // Fetch the latest heart rate samples
    const fetchHeartRate = useCallback(async () => {
        if (!CapacitorHealthkit || !isAuthorized) return;

        try {
            const now = new Date();
            const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

            const result = await CapacitorHealthkit.querySampleType({
                sampleName: 'heartRate',
                startDate: oneMinuteAgo.toISOString(),
                endDate: now.toISOString(),
                limit: 10,
            });

            if (result && result.resultData && result.resultData.length > 0) {
                // Get the most recent heart rate value
                const samples: HeartRateSample[] = result.resultData;
                const latestSample = samples[samples.length - 1];
                const latestBPM = Math.round(latestSample.value);

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
            }
        } catch (err: any) {
            console.error('Failed to fetch heart rate:', err);
            // Don't set error for transient failures during monitoring
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
