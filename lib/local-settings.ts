'use client';

import * as localDB from './localDB';
import { emitLocalDataChanged, enqueueCloudWrite } from './local-first';

type SingletonStore = 'user_settings' | 'user_profile' | 'user_prompts' | 'reminder_settings';

export async function getLocalSingleton<T>(store: SingletonStore, id: string, fallback: T): Promise<T> {
    const record = await localDB.getById<{ id: string; value?: T }>(store, id);
    return record?.value ?? fallback;
}

export async function saveLocalSingleton<T>(
    store: SingletonStore,
    id: string,
    value: T,
    options: { apiPath?: string; method?: 'POST' | 'PATCH'; syncStatus?: 'synced' | 'dirty'; body?: unknown } = {},
) {
    const record = {
        id,
        value,
        syncStatus: options.syncStatus ?? (options.apiPath ? 'dirty' as const : 'synced' as const),
        updatedAt: new Date().toISOString(),
    };
    await localDB.put(store, record);
    emitLocalDataChanged(store);

    if (options.apiPath) {
        await enqueueCloudWrite({
            store,
            apiPath: options.apiPath,
            method: options.method ?? 'POST',
            body: options.body ?? value,
        });
    }

    return value;
}

export const LOCAL_AI_SETTINGS_ID = 'ai';
export const LOCAL_TTS_SETTINGS_ID = 'tts';
export const LOCAL_TTS_STUDIO_CATEGORIES_ID = 'tts-studio-categories';
export const LOCAL_PROFILE_ID = 'profile';
export const LOCAL_PROMPTS_ID = 'prompts';
export const LOCAL_SYSTEM_PROMPT_ID = 'system-prompt';
export const LOCAL_QUIT_DATE_ID = 'quit-date';
export const LOCAL_REMINDER_SETTINGS_ID = 'reminders';
