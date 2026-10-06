import { decodeState, defaultState, type PersistedState } from './persistence';

export interface CloudRecord { state: PersistedState; revision: number; updatedAt: string }
export interface CachedModel { state: PersistedState; revision: number; pending: boolean }
export interface SyncStorage {
  read(): CachedModel | null;
  write(value: CachedModel): void;
  backup(state: PersistedState): void;
  legacy(): PersistedState | null;
  claimLegacy(): void;
}
export interface SyncTransport {
  load(): Promise<CloudRecord | null>;
  save(state: PersistedState, revision: number): Promise<CloudRecord>;
}
export class ConflictError extends Error {
  readonly record: CloudRecord;
  constructor(record: CloudRecord) { super('The cloud model changed on another device.'); this.record = record; }
}
export interface SyncView {
  state: PersistedState;
  status: 'loading' | 'saved' | 'saving' | 'offline' | 'conflict' | 'error';
  message: string;
  conflict: CloudRecord | null;
  ready: boolean;
  storageWarning: boolean;
}

/** One writer per browser; database revisions arbitrate writers on other devices. */
export class CloudSync {
  view: SyncView = { state: defaultState(), status: 'loading', message: 'Loading your saved model…', conflict: null, ready: false, storageWarning: false };
  private revision = 0;
  private pending = false;
  private saving = false;
  private generation = 0;
  private stopped = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private listeners = new Set<() => void>();
  private transport: SyncTransport;
  private storage: SyncStorage;
  constructor(transport: SyncTransport, storage: SyncStorage) { this.transport = transport; this.storage = storage; }
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  snapshot = () => this.view;
  private publish(update: Partial<SyncView>) { if (this.stopped) return; this.view = { ...this.view, ...update }; this.listeners.forEach(fn => fn()); }
  private cache() {
    try { this.storage.write({ state: this.view.state, revision: this.revision, pending: this.pending }); }
    catch { this.publish({ storageWarning: true }); }
  }
  private backup(state: PersistedState) { try { this.storage.backup(state); } catch { this.publish({ storageWarning: true }); } }
  private conflict(record: CloudRecord, message = 'This model was changed on another computer. Choose which version to keep.') {
    this.backup(this.view.state);
    this.publish({ ready: true, status: 'conflict', conflict: record, message });
  }
  async start() {
    if (this.stopped) return;
    this.publish({ status: 'loading', message: 'Loading your saved model…' });
    let cache: CachedModel | null = null;
    try { cache = this.storage.read(); } catch { this.publish({ storageWarning: true }); }
    let legacy: PersistedState | null = null;
    try { legacy = this.storage.legacy(); } catch { this.publish({ storageWarning: true }); }
    this.publish({ state: cache?.state ?? legacy ?? defaultState() });
    this.revision = cache?.revision ?? 0;
    this.pending = cache?.pending ?? false;
    try {
      const remote = await this.transport.load();
      if (this.stopped) return;
      if (!remote) {
        this.pending = true;
        this.publish({ ready: true, status: 'saving', message: legacy ? 'Importing your browser setup…' : 'Creating your cloud model…' });
        this.cache();
        await this.flush();
      } else if (cache?.pending) {
        this.publish({ ready: true });
        if (remote.revision !== cache.revision) this.conflict(remote);
        else await this.flush();
      } else if (!cache && legacy && JSON.stringify(legacy) !== JSON.stringify(remote.state)) {
        this.pending = true;
        this.conflict(remote, 'This browser has an existing setup and your account already has a cloud model. Choose the setup you want to use. Both copies will be backed up here.');
      } else {
        this.accept(remote);
      }
    } catch (error) {
      if (this.stopped) return;
      console.warn('Cloud model load failed:', error instanceof Error ? error.message : 'Connection unavailable');
      this.publish({ ready: !!cache, status: 'error', message: cache ? 'Cloud unavailable. Your cached model is safe; changes will wait for reconnection.' : 'Could not load your cloud model. Your browser setup is safe. Please retry.' });
      if (error instanceof ConflictError) this.conflict(error.record);
    }
  }
  private accept(record: CloudRecord) {
    this.revision = record.revision;
    this.pending = false;
    this.publish({ state: decodeState(record.state), ready: true, status: 'saved', conflict: null, message: 'Saved to your account' });
    this.cache();
  }
  update(update: PersistedState | ((previous: PersistedState) => PersistedState)) {
    if (!this.view.ready) return;
    const state = typeof update === 'function' ? update(this.view.state) : update;
    if (state === this.view.state) return;
    this.generation++;
    this.pending = true;
    this.publish({ state, status: this.view.conflict ? 'conflict' : 'saving', message: this.view.conflict ? this.view.message : 'Saving…' });
    this.cache();
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { void this.flush(); }, 650);
  }
  async flush() {
    if (this.saving || !this.pending || this.view.conflict || this.stopped) return;
    this.saving = true;
    const state = this.view.state;
    const generation = this.generation;
    this.publish({ status: 'saving', message: 'Saving…' });
    try {
      const result = await this.transport.save(state, this.revision);
      if (this.stopped) return;
      this.revision = result.revision;
      this.pending = generation !== this.generation;
      this.publish({ status: this.pending ? 'saving' : 'saved', message: this.pending ? 'Saving…' : 'Saved to your account' });
      this.cache();
      try { this.storage.claimLegacy(); } catch { this.publish({ storageWarning: true }); }
    } catch (error) {
      console.warn('Cloud model save failed:', error instanceof Error ? error.message : 'Connection unavailable');
      if (error instanceof ConflictError) this.conflict(error.record);
      else this.publish({ status: 'offline', message: 'Not saved to cloud yet. Changes are kept on this device and will retry automatically.' });
    } finally {
      this.saving = false;
      if (this.pending && this.view.status === 'saving' && !this.stopped) void this.flush();
    }
  }
  async refresh() {
    if (this.stopped || this.saving || this.view.conflict) return;
    if (!this.view.ready) { await this.start(); return; }
    if (this.pending) { await this.flush(); return; }
    const generation = this.generation;
    try {
      const record = await this.transport.load();
      if (!record || this.stopped || this.saving || this.view.conflict) return;
      if (this.generation !== generation || this.pending) {
        if (record.revision !== this.revision) this.conflict(record);
      } else if (record.revision !== this.revision) this.accept(record);
      else if (this.view.status === 'error' || this.view.status === 'offline') this.publish({ status: 'saved', message: 'Saved to your account' });
    } catch { if (!this.pending && !this.saving) this.publish({ status: 'offline', message: 'Cloud connection unavailable. Your model is kept on this device.' }); }
  }
  useCloud() {
    if (!this.view.conflict) return;
    this.backup(this.view.state);
    this.accept(this.view.conflict);
    try { this.storage.claimLegacy(); } catch { this.publish({ storageWarning: true }); }
  }
  async useDevice() {
    if (!this.view.conflict) return;
    this.backup(this.view.conflict.state);
    this.revision = this.view.conflict.revision;
    this.pending = true;
    this.publish({ conflict: null, status: 'saving', message: 'Saving this device’s model…' });
    this.cache();
    await this.flush();
  }
  stop() { this.stopped = true; clearTimeout(this.timer); this.listeners.clear(); }
}
