'use client';

/**
 * 温和后台同步管理器。
 *
 * UI 只依赖 IndexedDB；这里负责空闲时把 outbox 推到云端，再把云端快照合并回本地。
 */

import { useEffect, useRef } from 'react';
import * as localDB from '../localDB';
import type { LocalRecordMeta, StoreName, SyncOutboxItem } from '../localDB';
import { getApiUrl } from '../config';
import { emitLocalDataChanged } from '../local-first';
import { preserveLocalTTSCardCategoryFields } from '../tts-card-category-sync';

const SYNC_INTERVAL = 5 * 60 * 1000;
const INITIAL_SYNC_DELAY = 6500;
let syncInFlight: Promise<void> | null = null;

const SYNC_TARGETS: { store: StoreName; api: string }[] = [
    { store: 'tts_cards', api: '/api/tts/cards' },
    { store: 'meditation_topics', api: '/api/meditation/cards' },
    { store: 'meditation_sessions', api: '/api/meditation/sessions' },
    { store: 'user_danger_times', api: '/api/danger-times' },
];

function isVisibleCloudRecord(record: LocalRecordMeta | undefined) {
    return record?.syncStatus !== 'dirty' && record?.syncStatus !== 'pending_delete';
}

async function fetchJson(path: string, init?: RequestInit) {
    const res = await fetch(getApiUrl(path), init);
    if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${path} failed: ${res.status}`);
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
}

async function markRecordSynced(item: SyncOutboxItem, data: unknown) {
    if (!item.recordId || item.store === 'sync_outbox') return;

    if (item.method === 'DELETE') {
        await localDB.remove(item.store, item.recordId);
        emitLocalDataChanged(item.store);
        return;
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        const existing = await localDB.getById<any>(item.store, item.recordId);
        if (existing) {
            await localDB.put<any>(item.store, {
                ...existing,
                syncStatus: 'synced',
                updatedAt: new Date().toISOString(),
            });
            emitLocalDataChanged(item.store);
        }
        return;
    }

    const existing = await localDB.getById<any>(item.store, item.recordId);
    await localDB.put<any>(item.store, {
        ...preserveLocalTTSCardCategoryFields(
            item.store,
            data as Record<string, unknown>,
            existing,
        ),
        syncStatus: 'synced',
        updatedAt: new Date().toISOString(),
    });
    emitLocalDataChanged(item.store);
}

async function processOutbox() {
    const items = await localDB.getSyncOutbox();
    for (const item of items) {
        try {
            const data = await fetchJson(item.apiPath, {
                method: item.method,
                headers: item.body ? { 'Content-Type': 'application/json' } : undefined,
                body: item.body ? JSON.stringify(item.body) : undefined,
            });
            await markRecordSynced(item, data);
            await localDB.removeSyncOutboxItem(item.id);
            emitLocalDataChanged('sync_outbox');
        } catch (e) {
            await localDB.markSyncOutboxFailed(item, e);
            emitLocalDataChanged('sync_outbox');
            console.warn('[Sync] outbox item failed:', item.apiPath, e);
        }
    }
}

async function mergeCloudSnapshot(storeName: StoreName, cloudRows: any[]) {
    const localRows = await localDB.getAll<any>(storeName);
    const localById = new Map(localRows.map((row) => [row.id, row]));
    const merged = new Map<string, any>();

    for (const cloudRow of cloudRows) {
        const localRow = localById.get(cloudRow.id);
        if (localRow && !isVisibleCloudRecord(localRow)) {
            merged.set(localRow.id, localRow);
        } else {
            merged.set(cloudRow.id, {
                ...preserveLocalTTSCardCategoryFields(storeName, cloudRow, localRow),
                syncStatus: 'synced',
                updatedAt: new Date().toISOString(),
            });
        }
    }

    for (const localRow of localRows) {
        if (!merged.has(localRow.id) && !isVisibleCloudRecord(localRow)) {
            merged.set(localRow.id, localRow);
        }
    }

    await localDB.replaceAll(storeName, [...merged.values()]);
    await localDB.setLastSyncTime(storeName);
    emitLocalDataChanged(storeName);
}

async function pullFromCloud(storeName: StoreName, apiPath: string): Promise<boolean> {
    try {
        const data = await fetchJson(apiPath);
        if (Array.isArray(data)) {
            await mergeCloudSnapshot(storeName, data);
            console.log(`[Sync] ${storeName}: pulled ${data.length} rows`);
            return true;
        }
    } catch (e) {
        console.warn(`[Sync] ${storeName} pull skipped:`, e);
    }
    return false;
}

export async function syncAll(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!navigator.onLine) return;
    if (syncInFlight) return syncInFlight;

    syncInFlight = (async () => {
        await processOutbox();
        const results = await Promise.allSettled(
            SYNC_TARGETS.map((target) => pullFromCloud(target.store, target.api)),
        );
        const succeeded = results.filter((result) => result.status === 'fulfilled' && result.value).length;
        console.log(`[Sync] completed: ${succeeded}/${SYNC_TARGETS.length} pulled`);
    })().finally(() => {
        syncInFlight = null;
    });

    return syncInFlight;
}

function scheduleIdleSync(delay = 0) {
    if (typeof window === 'undefined') return;
    window.setTimeout(() => {
        const requestIdle = (window as any).requestIdleCallback as undefined | ((cb: () => void, options?: { timeout: number }) => number);
        if (requestIdle) {
            requestIdle(() => { void syncAll(); }, { timeout: 5000 });
        } else {
            void syncAll();
        }
    }, delay);
}

export function useBackgroundSync() {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        scheduleIdleSync(INITIAL_SYNC_DELAY);

        intervalRef.current = setInterval(() => {
            scheduleIdleSync();
        }, SYNC_INTERVAL);

        const handleOnline = () => scheduleIdleSync(1000);
        const handleSyncRequested = () => scheduleIdleSync();

        window.addEventListener('online', handleOnline);
        window.addEventListener('rain-sync-requested', handleSyncRequested);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('rain-sync-requested', handleSyncRequested);
        };
    }, []);
}
