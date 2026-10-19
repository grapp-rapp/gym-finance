import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserStorage, cloudTransport } from './transport';
import type { AuthClient } from './authClient';
vi.mock('./authClient', () => ({ getAuthToken: vi.fn(async () => 'test-token') }));
import { defaultState, LEGACY_STORAGE_KEY } from '../state/persistence';
afterEach(() => vi.unstubAllGlobals());
function storageFixture() {
  const entries = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => entries.set(key, value) });
  return entries;
}
describe('account-scoped browser migration', () => {
  it('does not mistake defaults on a fresh second computer for an existing setup', () => {
    const entries = storageFixture(); entries.set(LEGACY_STORAGE_KEY, JSON.stringify(defaultState()));
    expect(browserStorage('account-a').legacy()).toBeNull();
  });
  it('imports existing settings, then prevents another account from claiming them', () => {
    const entries = storageFixture(); const state = structuredClone(defaultState()); state.assumptions.selfFinancing = 222000; state.actuals = [{ timelineMonth: 3, note: 'Saved original' }];
    entries.set(LEGACY_STORAGE_KEY, JSON.stringify(state)); const a = browserStorage('account-a'); expect(a.legacy()).toEqual(state); a.claimLegacy();
    expect(browserStorage('account-b').legacy()).toBeNull(); expect(entries.get(LEGACY_STORAGE_KEY)).toBe(JSON.stringify(state));
  });
  it('keeps account caches separate and preserves pending changes across refresh', () => {
    storageFixture(); const a = browserStorage('account-a'); a.write({ state: defaultState(), revision: 2, pending: true });
    expect(browserStorage('account-a').read()?.pending).toBe(true); expect(browserStorage('account-b').read()).toBeNull();
  });
});


describe('cloud model upgrades', () => {
  it('applies the reinvestment policy to the remote account model on every computer', async () => {
    const old = defaultState(); delete old.assumptions.acquisition!.capitalPolicyVersion;
    old.assumptions.sweepsEnabled = true; old.assumptions.acquisition!.phase2Enabled = false;
    old.assumptions.acquisition!.phase2Gross = 150000;
    old.assumptions.priceStandard = 267; old.assumptions.vatRate = .18;
    const original = structuredClone(old);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ model: { state: old, revision: 9, updatedAt: 'test' } }) })));
    const loaded = await cloudTransport({} as AuthClient).load();
    expect(loaded?.revision).toBe(9);
    expect(loaded?.state.assumptions.sweepsEnabled).toBe(false);
    expect(loaded?.state.assumptions.acquisition?.phase2Gross).toBe(200000);
    expect(loaded?.state.assumptions.priceStandard).toBe(267);
    expect(loaded?.state.assumptions.vatRate).toBe(.18);
    expect(old).toEqual(original);
  });
});
