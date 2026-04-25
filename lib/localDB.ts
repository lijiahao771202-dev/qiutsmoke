'use client';

/**
 * IndexedDB 本地数据缓存层
 * 
 * 为应用提供毫秒级的本地数据读写能力。
 * 所有业务数据优先从这里读取，云端 Supabase 退化为后台同步角色。
 * 
 * 参考了已有的 lib/audioCache.ts 的 IndexedDB 模式。
 */

const DB_NAME = 'rain-local-data';
const DB_VERSION = 2;

// 所有需要本地缓存的数据表
const STORES = [
    'tts_cards',
    'tts_card_synth_meta',
    'meditation_topics',
    'meditation_sessions',
    'user_danger_times',
    'sync_meta',         // 存储每张表的最后同步时间
] as const;

export type StoreName = typeof STORES[number];

// ─── 数据库连接（单例） ───

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
    if (dbInstance) return Promise.resolve(dbInstance);
    if (dbPromise) return dbPromise;

    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            dbPromise = null;
            reject(request.error);
        };

        request.onsuccess = () => {
            dbInstance = request.result;
            // 当数据库连接意外关闭时重置单例
            dbInstance.onclose = () => { dbInstance = null; dbPromise = null; };
            resolve(dbInstance);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            for (const name of STORES) {
                if (!db.objectStoreNames.contains(name)) {
                    if (name === 'sync_meta') {
                        db.createObjectStore(name, { keyPath: 'store' });
                    } else {
                        db.createObjectStore(name, { keyPath: 'id' });
                    }
                }
            }
        };
    });

    return dbPromise;
}

// ─── 通用 CRUD ───

/** 读取某张表的全部数据 */
export async function getAll<T>(storeName: StoreName): Promise<T[]> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result as T[]);
        });
    } catch (e) {
        console.warn(`[LocalDB] getAll(${storeName}) failed:`, e);
        return [];
    }
}

/** 读取单条数据 */
export async function getById<T>(storeName: StoreName, id: string): Promise<T | undefined> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result as T | undefined);
        });
    } catch (e) {
        console.warn(`[LocalDB] getById(${storeName}, ${id}) failed:`, e);
        return undefined;
    }
}

/** 写入/更新单条数据 */
export async function put<T extends { id: string }>(storeName: StoreName, data: T): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.put(data);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    } catch (e) {
        console.warn(`[LocalDB] put(${storeName}) failed:`, e);
    }
}

/** 批量写入（用于云端同步结果的整体落地，先清空再写入） */
export async function replaceAll<T>(storeName: StoreName, dataArray: T[]): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            // 先清空旧数据
            store.clear();
            // 再逐条写入新数据
            for (const item of dataArray) {
                store.put(item);
            }
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        console.warn(`[LocalDB] replaceAll(${storeName}) failed:`, e);
    }
}

/** 删除单条数据 */
export async function remove(storeName: StoreName, id: string): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.delete(id);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    } catch (e) {
        console.warn(`[LocalDB] remove(${storeName}, ${id}) failed:`, e);
    }
}

/** 获取某张表的记录数 */
export async function count(storeName: StoreName): Promise<number> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.count();
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    } catch (e) {
        console.warn(`[LocalDB] count(${storeName}) failed:`, e);
        return 0;
    }
}

// ─── 同步元数据 ───

interface SyncMeta {
    store: string;
    lastSyncAt: string;
}

/** 获取某张表的最后同步时间 */
export async function getLastSyncTime(storeName: StoreName): Promise<string | null> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('sync_meta', 'readonly');
            const store = tx.objectStore('sync_meta');
            const request = store.get(storeName);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const result = request.result as SyncMeta | undefined;
                resolve(result?.lastSyncAt ?? null);
            };
        });
    } catch (e) {
        return null;
    }
}

/** 标记某张表的同步完成时间 */
export async function setLastSyncTime(storeName: StoreName): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('sync_meta', 'readwrite');
            const store = tx.objectStore('sync_meta');
            const request = store.put({ store: storeName, lastSyncAt: new Date().toISOString() });
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    } catch (e) {
        console.warn(`[LocalDB] setLastSyncTime(${storeName}) failed:`, e);
    }
}
