'use client';

/**
 * Local-first data hooks.
 *
 * Pages read IndexedDB immediately and never block on Supabase/API. Cloud writes
 * are queued in a tiny outbox and flushed by the background sync manager.
 */

import { useEffect, useMemo, useState } from 'react';
import * as localDB from '../localDB';
import {
    createLocalId,
    emitLocalDataChanged,
    loadVisibleRecords,
    queueLocalCreate,
    queueLocalDelete,
    queueLocalPatch,
    enqueueCloudWrite,
    putLocalRecord,
    stripLocalMeta,
    subscribeLocalData,
    type LocalFirstRecord,
} from '../local-first';
import { buildTTSCardCloudPayload } from '../tts-card-category-sync';

export const swrConfig = {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 30000,
    shouldRetryOnError: false,
};

const LOCAL_DATA_CACHE = new Map<localDB.StoreName, LocalFirstRecord<{ id: string }>[]>();
const PRELOAD_STORES: localDB.StoreName[] = [
    'meditation_sessions',
    'meditation_topics',
    'tts_cards',
    'user_danger_times',
];

function getCachedRecords<T extends { id: string }>(store: localDB.StoreName) {
    return LOCAL_DATA_CACHE.get(store) as LocalFirstRecord<T>[] | undefined;
}

function setCachedRecords<T extends { id: string }>(store: localDB.StoreName, records: LocalFirstRecord<T>[]) {
    LOCAL_DATA_CACHE.set(store, records as LocalFirstRecord<{ id: string }>[]);
}

export function primeLocalDataCaches(stores: localDB.StoreName[] = PRELOAD_STORES) {
    const uncachedStores = stores.filter((store) => !LOCAL_DATA_CACHE.has(store));
    if (uncachedStores.length === 0) return Promise.resolve();

    return Promise.all(
        uncachedStores.map(async (store) => {
            try {
                const records = await loadVisibleRecords<{ id: string }>(store);
                setCachedRecords(store, records);
            } catch (error) {
                console.warn('[local-first] Failed to preload local store', store, error);
            }
        }),
    ).then(() => undefined);
}

function okResponse(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function useLocalStore<T extends { id: string }>(store: localDB.StoreName) {
    const hasCachedRecords = LOCAL_DATA_CACHE.has(store);
    const [records, setRecords] = useState<LocalFirstRecord<T>[]>(() => getCachedRecords<T>(store) ?? []);
    const [isLoading, setIsLoading] = useState(!hasCachedRecords);
    const [error, setError] = useState<unknown>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const data = await loadVisibleRecords<T>(store);
                setCachedRecords(store, data);
                if (!cancelled) {
                    setRecords(data);
                    setError(null);
                }
            } catch (e) {
                if (!cancelled) setError(e);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        load();
        const unsubscribe = subscribeLocalData(store, load);
        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, [store]);

    const mutate = async (next?: LocalFirstRecord<T>[] | Promise<LocalFirstRecord<T>[]>, shouldRevalidate = true) => {
        if (next) {
            const resolved = await next;
            setCachedRecords(store, resolved);
            setRecords(resolved);
        }
        if (shouldRevalidate) emitLocalDataChanged(store);
    };

    return { records, isLoading, error, mutate };
}

function isInMonth(isoString: string, month?: string) {
    if (!month) return true;
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return false;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}` === month;
}

// ─── TTS Cards ───

export interface TTSCard {
    id: string;
    user_id?: string;
    title?: string;
    content: string;
    voice_id: string;
    rate: string;
    guidance_level?: string;
    category_id?: string | null;
    subcategory_id?: string | null;
    created_at: string;
}

export function useTTSCards() {
    const { records, isLoading, error, mutate } = useLocalStore<TTSCard>('tts_cards');
    const cards = useMemo(
        () => [...records].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
        [records],
    );

    return {
        cards,
        isLoading,
        error,
        mutate,
        addCard: async (newCard: Partial<TTSCard>) => {
            const now = new Date().toISOString();
            const created: LocalFirstRecord<TTSCard> = {
                id: newCard.id ?? createLocalId('tts-card'),
                title: newCard.title,
                content: newCard.content ?? '',
                voice_id: newCard.voice_id ?? 'zh-CN-XiaohanNeural',
                rate: newCard.rate ?? '0%',
                guidance_level: newCard.guidance_level ?? 'medium',
                category_id: newCard.category_id ?? null,
                subcategory_id: newCard.subcategory_id ?? null,
                created_at: newCard.created_at ?? now,
                updatedAt: now,
                syncStatus: 'dirty',
            };
            await putLocalRecord('tts_cards', created);
            await enqueueCloudWrite({
                store: 'tts_cards',
                recordId: created.id,
                apiPath: '/api/tts/cards',
                method: 'POST',
                body: buildTTSCardCloudPayload(created),
            });
            return okResponse(stripLocalMeta(created), 201);
        },
        patchCard: async (id: string, patch: Partial<TTSCard>) => {
            const existing = await localDB.getById<LocalFirstRecord<TTSCard>>('tts_cards', id);
            if (!existing) {
                return okResponse({ error: 'Card not found' }, 404);
            }

            const cloudPatch = buildTTSCardCloudPayload({ id, ...patch });
            const hasCloudChanges = Object.keys(cloudPatch).length > 1;
            const updated: LocalFirstRecord<TTSCard> = {
                ...existing,
                ...patch,
                id,
                updatedAt: new Date().toISOString(),
                syncStatus: hasCloudChanges ? 'dirty' : existing.syncStatus ?? 'synced',
            };
            await putLocalRecord('tts_cards', updated);

            if (hasCloudChanges) {
                await enqueueCloudWrite({
                    store: 'tts_cards',
                    recordId: id,
                    apiPath: '/api/tts/cards',
                    method: 'PATCH',
                    body: cloudPatch,
                });
            }

            return okResponse(stripLocalMeta(updated), 200);
        },
        deleteCard: async (id: string) => {
            await queueLocalDelete('tts_cards', `/api/tts/cards?id=${encodeURIComponent(id)}`, id);
            return okResponse({ success: true });
        },
    };
}

// ─── Meditation Sessions + Stats ───

export interface StatsData {
    totalSessions: number;
    totalMinutes: number;
    totalDurationMinutes?: number;
    currentStreak: number;
    longestStreak: number;
    daysMeditated?: number;
    daysSinceLastMeditation?: number;
}

export interface Session {
    id: string;
    topic_id: string;
    topic_name: string;
    started_at: string;
    ended_at?: string;
    duration_seconds?: number;
}

export function computeMeditationStats(sessions: Session[]): StatsData {
    const finishedSessions = sessions.filter((session) => session.duration_seconds && session.duration_seconds > 0);
    const totalDurationSeconds = finishedSessions.reduce(
        (sum, session) => sum + (session.duration_seconds ?? 0),
        0,
    );
    const dates = Array.from(
        new Set(
            sessions
                .map((session) => {
                    const date = new Date(session.started_at);
                    if (Number.isNaN(date.getTime())) return '';
                    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                })
                .filter(Boolean),
        ),
    ).sort();

    let tempStreak = 0;
    let longestStreak = 0;
    let lastDate: Date | null = null;

    for (const dStr of dates) {
        const current = new Date(`${dStr}T00:00:00`);
        if (lastDate) {
            const diff = (current.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
            tempStreak = diff === 1 ? tempStreak + 1 : 1;
        } else {
            tempStreak = 1;
        }
        longestStreak = Math.max(longestStreak, tempStreak);
        lastDate = current;
    }

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    const lastSessionDate = dates[dates.length - 1];
    const currentStreak = lastSessionDate === todayStr || lastSessionDate === yesterdayStr ? tempStreak : 0;
    const daysSinceLastMeditation = lastSessionDate
        ? Math.max(0, Math.floor((new Date(`${todayStr}T00:00:00`).getTime() - new Date(`${lastSessionDate}T00:00:00`).getTime()) / (1000 * 60 * 60 * 24)))
        : -1;

    return {
        totalSessions: sessions.length,
        totalMinutes: Math.round(totalDurationSeconds / 60),
        totalDurationMinutes: Math.round(totalDurationSeconds / 60),
        currentStreak,
        longestStreak,
        daysMeditated: dates.length,
        daysSinceLastMeditation,
    };
}

export async function createMeditationSession(input: {
    topicId: string;
    topicName: string;
    startedAt?: string;
    endedAt?: string;
    durationSeconds?: number;
}) {
    const now = new Date().toISOString();
    const record = await queueLocalCreate('meditation_sessions', '/api/meditation/sessions', {
        id: createLocalId('session'),
        topic_id: input.topicId,
        topic_name: input.topicName,
        started_at: input.startedAt ?? now,
        ended_at: input.endedAt,
        duration_seconds: input.durationSeconds,
        created_at: now,
    });
    return stripLocalMeta(record) as unknown as Session;
}

export async function completeMeditationSession(id: string, durationSeconds: number, endedAt = new Date().toISOString()) {
    const existing = await localDB.getById<LocalFirstRecord<Session>>('meditation_sessions', id);
    if (!existing) return undefined;

    const updated = await queueLocalPatch('meditation_sessions', '/api/meditation/sessions', {
        ...existing,
        ended_at: endedAt,
        duration_seconds: durationSeconds,
    });
    return stripLocalMeta(updated) as unknown as Session;
}

export async function deleteAllMeditationSessions() {
    await localDB.replaceAll('meditation_sessions', []);
    emitLocalDataChanged('meditation_sessions');
    await enqueueCloudWrite({
        store: 'meditation_sessions',
        apiPath: '/api/meditation/sessions?all=true',
        method: 'DELETE',
    });
}

export function useMeditationSessions(month?: string) {
    const { records, isLoading, error, mutate } = useLocalStore<Session>('meditation_sessions');
    const sessions = useMemo(
        () => records
            .filter((session) => isInMonth(session.started_at, month))
            .sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at)),
        [records, month],
    );

    return {
        sessions,
        isLoading,
        error,
        mutate,
    };
}

export function useMeditationStats() {
    const { sessions, isLoading, error, mutate } = useMeditationSessions();
    const stats = useMemo(() => computeMeditationStats(sessions), [sessions]);

    return {
        stats,
        isLoading,
        error,
        mutate,
    };
}

// ─── Meditation Topics ───

export interface MeditationTopic {
    id: string;
    user_id?: string;
    title: string;
    prompt?: string;
    icon_name?: string;
    color_from?: string;
    color_to?: string;
    created_at: string;
}

export function useMeditationTopics() {
    const { records, isLoading, error, mutate } = useLocalStore<MeditationTopic>('meditation_topics');
    const topics = useMemo(
        () => [...records].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)),
        [records],
    );

    return {
        topics,
        isLoading,
        error,
        mutate,
        addTopic: async (topic: Partial<MeditationTopic>) => {
            const created = await queueLocalCreate('meditation_topics', '/api/meditation/cards', {
                id: topic.id ?? createLocalId('topic'),
                title: topic.title ?? '',
                prompt: topic.prompt ?? '',
                icon_name: topic.icon_name ?? 'wind',
                color_from: topic.color_from ?? 'rose-400',
                color_to: topic.color_to ?? 'rose-600',
                created_at: new Date().toISOString(),
            });
            return okResponse(stripLocalMeta(created), 201);
        },
        deleteTopic: async (id: string) => {
            await queueLocalDelete('meditation_topics', `/api/meditation/cards?id=${encodeURIComponent(id)}`, id);
            return okResponse({ success: true });
        },
    };
}
