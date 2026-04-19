"use client";

import { useCallback, useEffect, useRef } from "react";
import { KeepAwake } from "@capacitor-community/keep-awake";
import { useWakeLock } from "@/hooks/useWakeLock";

function isIOSPWA() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    // @ts-ignore - Safari iOS legacy standalone flag
    Boolean(navigator.standalone);

  return isIOS && standalone;
}

export function usePracticeKeepAwake() {
  const { requestWakeLock, releaseWakeLock } = useWakeLock();
  const fallbackVideoRef = useRef<HTMLVideoElement | null>(null);
  const activeRef = useRef(false);

  const ensureFallbackVideo = useCallback(() => {
    if (typeof document === "undefined") return null;
    if (fallbackVideoRef.current) return fallbackVideoRef.current;

    const video = document.createElement("video");
    video.src = "/keep-awake.mp4";
    video.loop = true;
    video.muted = true;
    video.setAttribute("muted", "true");
    video.playsInline = true;
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.preload = "auto";
    video.style.position = "fixed";
    video.style.width = "1px";
    video.style.height = "1px";
    video.style.opacity = "0.001";
    video.style.pointerEvents = "none";
    video.style.bottom = "0";
    video.style.right = "0";
    video.style.zIndex = "-1";
    document.body.appendChild(video);
    fallbackVideoRef.current = video;

    return video;
  }, []);

  const startFallbackVideo = useCallback(async () => {
    if (!isIOSPWA()) return;
    const video = ensureFallbackVideo();
    if (!video) return;

    try {
      await video.play();
      console.log("[PracticeKeepAwake] iOS PWA fallback video playing");
    } catch (error) {
      console.warn("[PracticeKeepAwake] iOS PWA fallback video failed", error);
    }
  }, [ensureFallbackVideo]);

  const stopFallbackVideo = useCallback(() => {
    const video = fallbackVideoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  }, []);

  const activate = useCallback(async () => {
    activeRef.current = true;

    KeepAwake.keepAwake().catch((error) => {
      console.warn("[PracticeKeepAwake] Capacitor KeepAwake failed", error);
    });

    await requestWakeLock().catch(() => null);
    await startFallbackVideo();
  }, [requestWakeLock, startFallbackVideo]);

  const deactivate = useCallback(async () => {
    activeRef.current = false;

    KeepAwake.allowSleep().catch((error) => {
      console.warn("[PracticeKeepAwake] Capacitor allowSleep failed", error);
    });

    await releaseWakeLock().catch(() => null);
    stopFallbackVideo();
  }, [releaseWakeLock, stopFallbackVideo]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && activeRef.current) {
        void startFallbackVideo();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [startFallbackVideo]);

  useEffect(() => {
    return () => {
      const video = fallbackVideoRef.current;
      if (video) {
        video.pause();
        video.remove();
        fallbackVideoRef.current = null;
      }
    };
  }, []);

  return {
    activate,
    deactivate,
  };
}
