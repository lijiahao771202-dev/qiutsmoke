'use client';

interface HeartRateIndicatorProps {
    currentBPM: number | null;
    isMonitoring: boolean;
    error: string | null;
}

export default function HeartRateIndicator({
    currentBPM,
    isMonitoring,
    error,
}: HeartRateIndicatorProps) {
    // Don't render if not monitoring and no data
    if (!isMonitoring && currentBPM === null) {
        return null;
    }

    return (
        <div
            className="absolute top-16 right-4 flex items-center gap-2 px-3 py-2 rounded-full z-50"
            style={{
                background: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
        >
            {/* Heart icon with pulse animation */}
            <span
                className={`text-xl ${isMonitoring ? 'animate-pulse' : ''}`}
                style={{ color: 'rgba(255, 100, 100, 0.9)' }}
            >
                ♥
            </span>

            {/* BPM number */}
            <span className="text-white text-base font-medium min-w-[36px]">
                {currentBPM ? currentBPM : '--'}
            </span>
        </div>
    );
}
