'use client';

import * as localDB from './localDB';
import type { LocalRecordMeta, StoreName, SyncOutboxItem } from './localDB';
import { getApiUrl } from './config';

export const LOCAL_DATA_EVENT = 'rain-local-data-changed';

export type LocalFirstRecord<T> = T & LocalRecordMeta & { id: string };

type ApiPayload = Record<string, unknown>;

export function createLocalId(prefix = 'local') {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function emitLocalDataChanged(store: StoreName) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(LOCAL_DATA_EVENT, { detail: { store } }));
}

export function subscribeLocalData(store: StoreName, callback: () => void) {
    if (typeof window === 'undefined') return () => {};
    const handler = (event: Event) => {
        const detail = (event as CustomEvent<{ store?: StoreName }>).detail;
        if (!detail?.store || detail.store === store) callback();
    };
    window.addEventListener(LOCAL_DATA_EVENT, handler);
    return () => window.removeEventListener(LOCAL_DATA_EVENT, handler);
}

export function stripLocalMeta<T extends Record<string, any>>(record: T): ApiPayload {
    const { syncStatus, updatedAt, cloudId, ...payload } = record;
    return payload;
}

export function visibleRecords<T extends { syncStatus?: string }>(records: T[]) {
    return records.filter((record) => record.syncStatus !== 'pending_delete');
}

export async function loadVisibleRecords<T extends { id: string }>(store: StoreName) {
    const records = await localDB.getAll<LocalFirstRecord<T>>(store);
    return visibleRecords(records);
}

export async function putLocalRecord<T extends { id: string }>(
    store: StoreName,
    record: LocalFirstRecord<T>,
    options: { emit?: boolean } = {},
) {
    await localDB.put(store, record);
    if (options.emit !== false) emitLocalDataChanged(store);
}

export async function enqueueCloudWrite(item: Omit<SyncOutboxItem, 'id' | 'createdAt'>) {
    const queued = await localDB.enqueueSync(item);
    emitLocalDataChanged('sync_outbox');
    scheduleBackgroundSync();
    return queued;
}

export function scheduleBackgroundSync(delayMs = 1200) {
    if (typeof window === 'undefined') return;
    window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('rain-sync-requested'));
    }, delayMs);
}

export async function queueLocalCreate<T extends { id?: string }>(
    store: StoreName,
    apiPath: string,
    data: T,
) {
    const now = new Date().toISOString();
    const record = {
        ...data,
        id: data.id ?? createLocalId(store),
        created_at: (data as any).created_at ?? now,
        updatedAt: now,
        syncStatus: 'dirty' as const,
    } as LocalFirstRecord<T & { id: string }>;

    await putLocalRecord(store, record);
    await enqueueCloudWrite({
        store,
        recordId: record.id,
        apiPath,
        method: 'POST',
        body: stripLocalMeta(record),
    });
    return record;
}

export async function queueLocalPatch<T extends { id: string }>(
    store: StoreName,
    apiPath: string,
    record: LocalFirstRecord<T>,
) {
    const updated = {
        ...record,
        updatedAt: new Date().toISOString(),
        syncStatus: 'dirty' as const,
    };

    await putLocalRecord(store, updated);
    await enqueueCloudWrite({
        store,
        recordId: updated.id,
        apiPath,
        method: 'PATCH',
        body: stripLocalMeta(updated),
    });
    return updated;
}

export async function queueLocalDelete(store: StoreName, apiPath: string, id: string) {
    const existing = await localDB.getById<LocalFirstRecord<{ id: string }>>(store, id);
    if (existing) {
        await putLocalRecord(store, {
            ...existing,
            syncStatus: 'pending_delete',
            updatedAt: new Date().toISOString(),
        });
    } else {
        emitLocalDataChanged(store);
    }

    await enqueueCloudWrite({
        store,
        recordId: id,
        apiPath,
        method: 'DELETE',
    });
}

export async function fetchWithTimeout(path: string, init?: RequestInit, timeoutMs = 8000) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(getApiUrl(path), { ...init, signal: controller.signal });
    } finally {
        window.clearTimeout(timeout);
    }
}

