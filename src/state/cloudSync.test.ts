import { describe, it, expect, vi } from 'vitest';
import { CloudSync, ConflictError, type CachedModel, type CloudRecord, type SyncTransport, type SyncStorage } from './cloudSync';
import { defaultState, type PersistedState } from './persistence';
import { runModel } from '../model';
const clone = <T,>(x: T): T => structuredClone(x);
const model = () => { const s = clone(defaultState()); s.assumptions.selfFinancing = 180000; s.assumptions.priceStandard = 270; s.actuals = [{ timelineMonth: 5, membershipCashIn: 99000, note: 'Our first month' }]; s.scenarios[0].salaryStep = { enabled: true, operatingMonth: 13, partner1Gross: 8000, partner2Gross: 7000 }; return s; };
function fixture(remote: CloudRecord | null = null, legacy: PersistedState | null = null, initial: CachedModel | null = null) {
  let record = clone(remote), cache = clone(initial);
  const backups: PersistedState[] = [];
  const storage: SyncStorage = { read: () => cache, write: value => { cache = clone(value); }, backup: s => backups.push(clone(s)), legacy: () => legacy, claimLegacy: vi.fn() };
  const transport: SyncTransport = { load: vi.fn(async () => clone(record)), save: vi.fn(async (state, revision) => {
    if ((record?.revision ?? 0) !== revision) throw new ConflictError(clone(record!));
    record = { state: clone(state), revision: revision + 1, updatedAt: '2026-10-06' }; return clone(record);
  }) };
  return { sync: new CloudSync(transport, storage), transport, storage, backups, getRecord: () => record, getCache: () => cache, setRecord: (value: CloudRecord) => { record = clone(value); } };
}
describe('cloud persistence', () => {
  it('imports the whole existing model without changing any financial outputs', async () => {
    const state = model(), f = fixture(null, state); await f.sync.start();
    expect(f.sync.view.status).toBe('saved'); expect(f.getRecord()?.state).toEqual(state);
    expect(runModel(f.sync.view.state.assumptions, f.sync.view.state.scenarios[0])).toEqual(runModel(state.assumptions, state.scenarios[0]));
    expect(f.storage.claimLegacy).toHaveBeenCalledOnce(); expect(f.getCache()?.pending).toBe(false);
  });
  it('loads the same saved model on a second device without importing defaults over it', async () => {
    const state = model(), f = fixture({ state, revision: 4, updatedAt: '' }); await f.sync.start();
    expect(f.sync.view.state).toEqual(state); expect(f.transport.save).not.toHaveBeenCalled();
  });
  it('requires a choice when an original browser setup differs from an existing account model', async () => {
    const state = model(), cloud = clone(defaultState()), f = fixture({ state: cloud, revision: 1, updatedAt: '' }, state); await f.sync.start();
    expect(f.sync.view.status).toBe('conflict'); expect(f.transport.save).not.toHaveBeenCalled();
    await f.sync.useDevice(); expect(f.getRecord()?.state).toEqual(state); expect(f.backups).toContainEqual(cloud);
  });
  it('preserves the device copy when choosing the cloud model', async () => {
    const state = model(), f = fixture({ state: defaultState(), revision: 3, updatedAt: '' }, state); await f.sync.start(); f.sync.useCloud();
    expect(f.backups).toContainEqual(state); expect(f.sync.view.status).toBe('saved'); expect(f.transport.save).not.toHaveBeenCalled();
  });
  it('queues edits made during a save and never marks them as already saved', async () => {
    const f = fixture({ state: defaultState(), revision: 1, updatedAt: '' }); await f.sync.start();
    let complete!: (x: CloudRecord) => void;
    vi.mocked(f.transport.save).mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
    f.sync.update(model()); const first = f.sync.flush();
    const later = model(); later.assumptions.selfFinancing = 250000; f.sync.update(later);
    f.setRecord({ state: model(), revision: 2, updatedAt: '' }); complete(f.getRecord()!); await first;
    await vi.waitFor(() => expect(f.sync.view.status).toBe('saved'));
    expect(f.getRecord()?.state).toEqual(later); expect(f.getCache()?.pending).toBe(false); f.sync.stop();
  });
  it('retains offline changes and resumes after reconnecting', async () => {
    const f = fixture({ state: defaultState(), revision: 1, updatedAt: '' }); await f.sync.start();
    vi.mocked(f.transport.save).mockRejectedValueOnce(new Error('network')); f.sync.update(model()); await f.sync.flush();
    expect(f.sync.view.status).toBe('offline'); expect(f.getCache()?.pending).toBe(true);
    await f.sync.refresh(); expect(f.getRecord()?.state).toEqual(model()); expect(f.sync.view.status).toBe('saved'); f.sync.stop();
  });
  it('detects a simultaneous edit on another device instead of overwriting it', async () => {
    const f = fixture({ state: defaultState(), revision: 1, updatedAt: '' }); await f.sync.start();
    f.sync.update(model()); const other = model(); other.assumptions.capacity = 900; f.setRecord({ state: other, revision: 2, updatedAt: '' }); await f.sync.flush();
    expect(f.sync.view.status).toBe('conflict'); expect(f.getRecord()?.state).toEqual(other); expect(f.getCache()?.pending).toBe(true); f.sync.stop();
  });
  it('reloads a pending cache only after checking the cloud revision', async () => {
    const f = fixture({ state: defaultState(), revision: 9, updatedAt: '' }, null, { state: model(), revision: 7, pending: true }); await f.sync.start();
    expect(f.sync.view.status).toBe('conflict'); expect(f.sync.view.state).toEqual(model()); expect(f.transport.save).not.toHaveBeenCalled();
  });
  it('keeps editing closed when the initial cloud load fails without an account cache', async () => {
    const f = fixture(null, model()); vi.mocked(f.transport.load).mockRejectedValueOnce(new Error('network')); await f.sync.start();
    expect(f.sync.view.ready).toBe(false); expect(f.transport.save).not.toHaveBeenCalled(); expect(f.storage.claimLegacy).not.toHaveBeenCalled();
  });
  it('updates a clean device automatically when cloud changes', async () => {
    const f = fixture({ state: defaultState(), revision: 1, updatedAt: '' }); await f.sync.start(); f.setRecord({ state: model(), revision: 2, updatedAt: '' }); await f.sync.refresh();
    expect(f.sync.view.state).toEqual(model()); expect(f.transport.save).not.toHaveBeenCalled();
  });
  it('reports unavailable local backup without blocking a successful cloud save', async () => {
    const f = fixture(null, model()); f.storage.write = () => { throw new Error('quota'); }; await f.sync.start();
    expect(f.sync.view.storageWarning).toBe(true); expect(f.sync.view.status).toBe('saved');
  });
  it('does not claim the original browser setup if its first upload fails', async () => {
    const f = fixture(null, model()); vi.mocked(f.transport.save).mockRejectedValueOnce(new Error('network')); await f.sync.start();
    expect(f.storage.claimLegacy).not.toHaveBeenCalled(); expect(f.getCache()?.pending).toBe(true);
  });
});
