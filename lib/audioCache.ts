/**
 * IndexedDB 音频缓存工具
 * 用于存储 TTS 合成后的完整音频 Blob
 */

const DB_NAME = 'tts-audio-cache';
const DB_VERSION = 1;
const STORE_NAME = 'audio-blobs';

// 打开/创建数据库
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'cardId' });
            }
        };
    });
}

// 保存音频 Blob
export async function saveAudioCache(cardId: string, blob: Blob): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        const record = {
            cardId,
            blob,
            synthesizedAt: new Date().toISOString()
        };

        const request = store.put(record);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            console.log(`[AudioCache] ✅ 已缓存音频: ${cardId}`);
            resolve();
        };
    });
}

// 获取音频 Blob
export async function getAudioCache(cardId: string): Promise<Blob | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);

        const request = store.get(cardId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const result = request.result;
            if (result?.blob) {
                console.log(`[AudioCache] ✅ 命中缓存: ${cardId}`);
                resolve(result.blob);
            } else {
                resolve(null);
            }
        };
    });
}

// 删除音频缓存
export async function deleteAudioCache(cardId: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        const request = store.delete(cardId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            console.log(`[AudioCache] 🗑️ 已删除缓存: ${cardId}`);
            resolve();
        };
    });
}

// 检查是否有缓存
export async function hasAudioCache(cardId: string): Promise<boolean> {
    const blob = await getAudioCache(cardId);
    return blob !== null;
}

// 获取所有缓存的卡片 ID
export async function getAllCachedCardIds(): Promise<string[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);

        const request = store.getAllKeys();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            resolve(request.result as string[]);
        };
    });
}
