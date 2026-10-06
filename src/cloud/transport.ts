import type { AuthClient } from './Auth';
import { ConflictError, type CachedModel, type CloudRecord, type SyncStorage, type SyncTransport } from '../state/cloudSync';
import { decodeState, LEGACY_STORAGE_KEY, type PersistedState } from '../state/persistence';

export function cloudTransport(client: AuthClient): SyncTransport {
  async function request(method: string, body?: unknown) {
    const { data, error } = await client.token();
    if (error || !data?.token) throw new Error('Please sign in again.');
    const response = await fetch('/api/model', {
      method, headers: { Authorization: `Bearer ${data.token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000), cache: 'no-store',
    });
    const value = await response.json();
    if (response.status === 409) throw new ConflictError(value.model);
    if (!response.ok) throw new Error(value.error ?? 'Cloud request failed');
    return value.model as CloudRecord | null;
  }
  return { load: () => request('GET'), save: async (state, revision) => {
    const result = await request('PUT', { state, revision });
    if (!result) throw new Error('Save was not confirmed');
    return result;
  } };
}

export function browserStorage(userId: string): SyncStorage {
  const key = `shaar-binyamin/cloud/${userId}`;
  const claimKey = 'shaar-binyamin/legacy-owner';
  return {
    read() {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const cache = JSON.parse(raw) as CachedModel;
      if (!Number.isSafeInteger(cache.revision) || cache.revision < 0 || typeof cache.pending !== 'boolean') throw new Error('Invalid cache');
      return { ...cache, state: decodeState(cache.state) };
    },
    write(cache) { localStorage.setItem(key, JSON.stringify(cache)); },
    backup(state) {
      const backupKey = `${key}/backups`;
      const previous = JSON.parse(localStorage.getItem(backupKey) ?? '[]') as unknown[];
      localStorage.setItem(backupKey, JSON.stringify([{ savedAt: new Date().toISOString(), state }, ...previous].slice(0, 5)));
    },
    legacy() {
      const owner = localStorage.getItem(claimKey);
      if (owner && owner !== userId) return null;
      const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      return raw ? decodeState(JSON.parse(raw)) : null;
    },
    claimLegacy() { if (!localStorage.getItem(claimKey)) localStorage.setItem(claimKey, userId); },
  };
}
export function downloadBackup(state: PersistedState) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `gym-model-${new Date().toISOString().slice(0, 10)}.json`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
