"use client";

import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from "react";
import { SOUND_DATA, SoundPreset } from "@/lib/data/soundscapes";
import { useBinauralBeats, BinauralPreset } from "@/lib/hooks/useBinauralBeats";
import { useBackgroundAudio } from "@/hooks/useBackgroundAudio";
import { Howl, Howler } from "howler";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ActiveTrack {
    id: string;
    sound: Howl | null; // Howl instance for static files
    volume: number;     // Individual track volume (0-1)
    isDynamic: boolean;
    preset?: any;       // For dynamic tracks
}

interface WhiteNoiseContextType {
    isPlaying: boolean;
    activeTracks: Map<string, ActiveTrack>;
    masterVolume: number;

    // Actions
    toggleTrack: (trackId: string) => void;
    setTrackVolume: (trackId: string, volume: number) => void;
    setMasterVolume: (volume: number) => void;
    stopAll: () => void;
    togglePlayPause: () => void;
}

const WhiteNoiseContext = createContext<WhiteNoiseContextType | null>(null);

// -----------------------------------------------------------------------------
// Provider
// -----------------------------------------------------------------------------

export function WhiteNoiseProvider({ children }: { children: React.ReactNode }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeTracks, setActiveTracks] = useState<Map<string, ActiveTrack>>(new Map());
    const [masterVolume, setMasterVolume] = useState(0.8);
    const backgroundAudio = useBackgroundAudio();
    const backgroundSessionActiveRef = useRef(false);

    // Dynamic Binaural Hook
    const { start: startBinaural, stop: stopBinaural, setVolume: setBinauralVolume, isPlaying: isBinauralPlaying } = useBinauralBeats();

    // Refs for safe access
    const activeTracksRef = useRef<Map<string, ActiveTrack>>(new Map());
    const masterVolumeRef = useRef(0.8);
    const isPlayingRef = useRef(false);

    // iOS/PWA: prevent Howler from suspending audio context automatically.
    useEffect(() => {
        Howler.autoSuspend = false;
    }, []);

    // Helper to calculate target volume
    const getTargetVolume = useCallback((trackVol: number) => {
        return trackVol * masterVolumeRef.current;
    }, []);

    // Sync Master Volume (Instant, no fade needed for slider)
    useEffect(() => {
        masterVolumeRef.current = masterVolume;
        activeTracksRef.current.forEach(track => {
            if (track.sound) {
                // If currently playing (and not fading out to stop), update volume
                // Check if it's "active" state.
                // Simplification: just update volume.
                // If it's fading, this might interfere.
                // But usually sliders are moved when playing.
                track.sound.volume(track.volume * masterVolume);
            } else if (track.isDynamic && track.id.startsWith('binaural-')) {
                setBinauralVolume(track.volume * masterVolume);
            }
        });
    }, [masterVolume, setBinauralVolume]);

    // Handle Global Play/Pause with Fade
    useEffect(() => {
        isPlayingRef.current = isPlaying;

        activeTracksRef.current.forEach(track => {
            if (track.sound) {
                const targetVol = track.volume * masterVolumeRef.current;

                if (isPlaying) {
                    // RESUME / PLAY
                    if (!track.sound.playing()) {
                        track.sound.volume(0);
                        track.sound.play();
                    }
                    track.sound.fade(0, targetVol, 1000);
                } else {
                    // PAUSE
                    if (track.sound.playing()) {
                        // Fade out then pause
                        track.sound.fade(track.sound.volume(), 0, 1000);
                        track.sound.once('fade', () => {
                            // Check if we are still paused! (User might have clicked Play quickly again)
                            if (!isPlayingRef.current) {
                                track.sound?.pause();
                            }
                        });
                    }
                }
            }

            // Binaural handling (Simulated fade via hook? Hook might not support fade nicely yet, but we'll try)
            if (track.isDynamic && track.id.startsWith('binaural-')) {
                if (isPlaying) {
                    if (!isBinauralPlaying) {
                        try {
                            startBinaural(track.preset as BinauralPreset);
                            // Binaural hook has its own fade in built-in usually? 
                            // Looking at useBinauralBeats: gainNode.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 3);
                            // It handles fade in!
                            // We just ensure volume is correct.
                            setTimeout(() => {
                                setBinauralVolume(track.volume * masterVolumeRef.current);
                            }, 50);
                        } catch (e) {
                            console.error("Failed to start binaural beat", e);
                        }
                    }
                } else {
                    stopBinaural(); // Hook handles fade out
                }
            }
        });
    }, [isPlaying, isBinauralPlaying, startBinaural, stopBinaural, setBinauralVolume]);

    // -------------------------------------------------------------------------
    // Actions
    // -------------------------------------------------------------------------

    const toggleTrack = useCallback((trackId: string) => {
        const currentMap = new Map(activeTracksRef.current);
        const existing = currentMap.get(trackId);

        if (existing) {
            // REMOVE TRACK (Fade out and destroy)
            if (existing.sound) {
                const s = existing.sound;
                s.fade(s.volume(), 0, 1000);
                s.once('fade', () => {
                    s.stop();
                    s.unload();
                });
            } else if (existing.isDynamic) {
                stopBinaural();
            }
            currentMap.delete(trackId);
        } else {
            // ADD TRACK
            let soundInfo: SoundPreset | undefined;
            for (const cat of SOUND_DATA) {
                const found = cat.sounds.find(s => s.id === trackId);
                if (found) {
                    soundInfo = found;
                    break;
                }
            }

            if (!soundInfo) return;

            if (soundInfo.src === 'BINAURAL_DYNAMIC') {
                // Dynamic Track Logic
                Array.from(currentMap.keys()).forEach(k => {
                    if (k.startsWith('binaural-')) {
                        // Stop existing binaural
                        const bTrack = currentMap.get(k);
                        if (bTrack?.isDynamic) stopBinaural();
                        currentMap.delete(k);
                    }
                });

                const newTrack: ActiveTrack = {
                    id: trackId,
                    sound: null,
                    volume: 0.5,
                    isDynamic: true,
                    // @ts-ignore
                    preset: soundInfo.originalPreset
                };
                currentMap.set(trackId, newTrack);

                const shouldPlay = isPlayingRef.current || currentMap.size === 1;
                if (shouldPlay) {
                    setIsPlaying(true);
                    // @ts-ignore
                    startBinaural(soundInfo.originalPreset, 1200);
                    setBinauralVolume(newTrack.volume * masterVolumeRef.current);
                }

            } else {
                // Static Audio with Howler
                const targetVol = 0.5 * masterVolumeRef.current;

                const sound = new Howl({
                    src: [soundInfo.src],
                    html5: true,
                    loop: true,
                    volume: 0, // Start silent for fade in
                    preload: true,
                    onloaderror: (id, err) => console.error(`Howl Load Error for ${soundInfo?.src}:`, err),
                    onplayerror: (id, err) => {
                        console.error(`Howl Play Error for ${soundInfo?.src}:`, err);
                        sound.once('unlock', () => {
                            sound.play();
                        });
                    }
                });

                const newTrack: ActiveTrack = {
                    id: trackId,
                    sound,
                    volume: 0.5,
                    isDynamic: false
                };
                currentMap.set(trackId, newTrack);

                const shouldPlay = isPlayingRef.current || currentMap.size === 1;
                if (shouldPlay) {
                    setIsPlaying(true);
                    sound.play();
                    sound.fade(0, targetVol, 1000);
                }
            }
        }

        activeTracksRef.current = currentMap;
        setActiveTracks(currentMap);

        if (currentMap.size === 0) {
            setIsPlaying(false);
        }

    }, [stopBinaural, startBinaural, setBinauralVolume]);

    const setTrackVolume = useCallback((trackId: string, volume: number) => {
        const currentMap = new Map(activeTracksRef.current);
        const track = currentMap.get(trackId);
        if (track) {
            track.volume = volume;
            const target = volume * masterVolumeRef.current;
            if (track.sound) {
                // If it's playing, fade to new volume?
                // Or just set it. Fade feels nicer for large jumps, but slide is continuous.
                // For slider dragging, direct set is better responsiveness.
                track.sound.volume(target);
            } else if (track.isDynamic && track.id.startsWith('binaural-')) {
                setBinauralVolume(target);
            }
            activeTracksRef.current = currentMap;
            setActiveTracks(currentMap);
        }
    }, [setBinauralVolume]);

    const setMasterVolumeAction = useCallback((volume: number) => {
        setMasterVolume(volume);
    }, []);

    const stopAll = useCallback(() => {
        activeTracksRef.current.forEach(track => {
            if (track.sound) track.sound.unload();
        });
        stopBinaural();
        activeTracksRef.current = new Map();
        setActiveTracks(new Map());
        setIsPlaying(false);
    }, [stopBinaural]);

    const togglePlayPause = useCallback(() => {
        setIsPlaying(prev => !prev);
    }, []);

    // Keep a MediaSession + keep-alive channel for PWA background playback.
    useEffect(() => {
        let cancelled = false;

        const syncBackgroundSession = async () => {
            const hasTracks = activeTracksRef.current.size > 0;

            if (isPlayingRef.current && hasTracks) {
                if (!backgroundSessionActiveRef.current) {
                    const firstTrack = Array.from(activeTracksRef.current.values())[0];
                    const title = activeTracksRef.current.size === 1
                        ? `White Noise · ${firstTrack?.id || 'Track'}`
                        : `White Noise · ${activeTracksRef.current.size} tracks`;

                    try {
                        await backgroundAudio.activate({
                            title,
                            artist: 'Rain',
                            album: 'Soundscapes',
                            onPlay: () => setIsPlaying(true),
                            onPause: () => setIsPlaying(false),
                            onStop: () => stopAll(),
                        });
                        if (!cancelled) {
                            backgroundSessionActiveRef.current = true;
                        }
                    } catch (e) {
                        console.warn('[WhiteNoise] background session activate failed', e);
                    }
                }

                backgroundAudio.setPlaybackState('playing');
            } else if (backgroundSessionActiveRef.current) {
                if (hasTracks) {
                    backgroundAudio.setPlaybackState('paused');
                } else {
                    try {
                        await backgroundAudio.deactivate();
                    } catch (e) {
                        console.warn('[WhiteNoise] background session deactivate failed', e);
                    }
                    backgroundSessionActiveRef.current = false;
                }
            }
        };

        syncBackgroundSession();
        return () => {
            cancelled = true;
        };
    }, [isPlaying, activeTracks, backgroundAudio, stopAll]);

    // Recover tracks when page becomes visible again (common iOS/PWA case).
    useEffect(() => {
        const onVisibilityChange = () => {
            if (document.visibilityState !== 'visible' || !isPlayingRef.current) return;

            activeTracksRef.current.forEach((track) => {
                if (track.sound && !track.sound.playing()) {
                    track.sound.play();
                    track.sound.volume(track.volume * masterVolumeRef.current);
                }
            });
        };

        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }, []);

    // Global unload on unmount (cleanup)
    useEffect(() => {
        return () => {
            // eslint-disable-next-line
            activeTracksRef.current.forEach(track => {
                if (track.sound) track.sound.unload();
            });
            if (backgroundSessionActiveRef.current) {
                backgroundAudio.deactivate().catch(() => { });
                backgroundSessionActiveRef.current = false;
            }
        };
    }, [backgroundAudio]);

    return (
        <WhiteNoiseContext.Provider value={{
            isPlaying,
            activeTracks,
            masterVolume,
            toggleTrack,
            setTrackVolume,
            setMasterVolume: setMasterVolumeAction,
            stopAll,
            togglePlayPause
        }}>
            {children}
        </WhiteNoiseContext.Provider>
    );
}

export function useGlobalWhiteNoise() {
    const context = useContext(WhiteNoiseContext);
    if (!context) {
        throw new Error("useGlobalWhiteNoise must be used within a WhiteNoiseProvider");
    }
    return context;
}
