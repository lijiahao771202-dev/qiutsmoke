"use client";

import React, { Suspense } from "react";
import { SoundscapesContent } from "@/components/soundscapes/SoundscapesContent";

export default function SoundscapesPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen w-full bg-[#1c1917] overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-b from-[#451a03] via-[#292524] to-[#0c0a09]" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin" />
                </div>
            </div>
        }>
            <SoundscapesContent />
        </Suspense>
    );
}
