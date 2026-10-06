import { createContext, useContext, useEffect, useState, useSyncExternalStore, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { useAccount, type AuthClient } from './Auth';
import { browserStorage, cloudTransport, downloadBackup } from './transport';
import { CloudSync, type SyncView } from '../state/cloudSync';
import { LEGACY_STORAGE_KEY, loadLegacy, type PersistedState } from '../state/persistence';

interface SavedModelValue { state: PersistedState; setState: Dispatch<SetStateAction<PersistedState>>; sync: SyncView | null; manager: CloudSync | null; localError: boolean }
const SavedModelContext = createContext<SavedModelValue | null>(null);
export function useSavedModel() { const value = useContext(SavedModelContext); if (!value) throw new Error('SavedModelProvider missing'); return value; }

export function SavedModelProvider({ children }: { children: ReactNode }) {
  const { client, user, checking } = useAccount();
  if (checking) return <LoadingModel message="Checking your account…" />;
  if (client && user) return <CloudModel key={user.id} userId={user.id} client={client}>{children}</CloudModel>;
  return <LocalModel>{children}</LocalModel>;
}
function LocalModel({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => loadLegacy().state);
  const [localError, setLocalError] = useState(false);
  useEffect(() => {
    // Do not write signed-in account data into the pre-login migration source.
    try { localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(state)); setLocalError(false); }
    catch { setLocalError(true); }
  }, [state]);
  return <SavedModelContext.Provider value={{ state, setState, sync: null, manager: null, localError }}>{children}</SavedModelContext.Provider>;
}
function CloudModel({ userId, client, children }: { userId: string; client: AuthClient; children: ReactNode }) {
  const [manager, setManager] = useState<CloudSync | null>(null);
  useEffect(() => {
    const instance = new CloudSync(cloudTransport(client), browserStorage(userId));
    setManager(instance);
    void instance.start();
    const refresh = () => { void instance.refresh(); };
    const visibility = () => { if (document.visibilityState === 'visible') refresh(); };
    const timer = setInterval(refresh, 30000);
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', visibility);
    const beforeLeave = (event: BeforeUnloadEvent) => {
      if (instance.view.status !== 'saved') { event.preventDefault(); }
    };
    window.addEventListener('beforeunload', beforeLeave);
    return () => { instance.stop(); clearInterval(timer); window.removeEventListener('online', refresh); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('beforeunload', beforeLeave); };
  }, [client, userId]);
  if (!manager) return <LoadingModel message="Loading your saved model…" />;
  return <SyncedModel manager={manager}>{children}</SyncedModel>;
}
function SyncedModel({ manager, children }: { manager: CloudSync; children: ReactNode }) {
  const sync = useSyncExternalStore(manager.subscribe, manager.snapshot);
  if (!sync.ready) return <LoadingModel message={sync.message} retry={sync.status === 'error' ? () => { void manager.start(); } : undefined} />;
  return <SavedModelContext.Provider value={{ state: sync.state, setState: update => manager.update(update), sync, manager, localError: false }}>{children}</SavedModelContext.Provider>;
}
function LoadingModel({ message, retry }: { message: string; retry?: () => void }) {
  const { client } = useAccount();
  return <main className="grid min-h-dvh place-items-center bg-canvas p-6"><div className="max-w-md rounded-2xl border border-line bg-white p-8 text-center"><h1 className="text-xl font-semibold text-ink">Shaar Binyamin Gym</h1><p role="status" className="mt-4 text-muted">{message}</p>{retry && <div className="mt-5 flex justify-center gap-4"><button className="rounded-xl bg-brand px-4 py-2 text-white" onClick={retry}>Retry</button><button className="text-brand" onClick={() => { void client?.signOut(); }}>Sign out</button></div>}</div></main>;
}
export function AccountBar() {
  const { client, user, open } = useAccount();
  const { state, sync, manager, localError } = useSavedModel();
  const [signOutError, setSignOutError] = useState('');
  const signOut = async () => {
    setSignOutError('');
    if (sync && sync.status !== 'saved') { await manager?.flush(); if (manager?.view.status !== 'saved') { setSignOutError('Save or download your pending changes before signing out.'); return; } }
    const result = await client?.signOut();
    if (result?.error) setSignOutError('Could not sign out. Please try again.');
  };
  return <div className="no-print border-b border-line bg-white">
    <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm sm:px-6">
      <span role="status" aria-live="polite" className={sync && sync.status !== 'saved' ? 'text-ink' : 'text-muted'}>{sync ? sync.message : localError ? 'Browser saving unavailable. Download a backup.' : 'Saved in this browser'}{sync?.storageWarning && ' · Browser backup unavailable'}</span>
      <div className="flex flex-wrap items-center gap-3">{user && <span className="max-w-52 truncate text-muted">{user.email}</span>}
        {(sync?.status === 'offline' || sync?.status === 'error') && <button onClick={() => { void manager?.refresh(); }} className="text-brand">Retry saving</button>}
        <button className="text-brand" onClick={() => downloadBackup(state)}>Download backup</button>
        {user ? <button className="text-brand" onClick={() => { void signOut(); }}>Sign out</button> : client ? <button className="rounded-lg bg-brand px-3 py-1.5 font-medium text-white" onClick={open}>Sign in to sync</button> : <span className="text-muted">Cloud connection unavailable</span>}
      </div>
    </div>
    {signOutError && <p role="alert" className="mx-auto max-w-[1600px] px-4 pb-3 text-sm text-bad">{signOutError}</p>}
    {sync?.conflict && <div role="alert" className="mx-auto max-w-[1600px] border-t border-line px-4 py-4 sm:px-6"><p className="text-sm text-ink">{sync.message}</p><div className="mt-3 flex flex-wrap gap-3"><button className="rounded-xl bg-brand px-4 py-2 text-white" onClick={() => manager?.useCloud()}>Use cloud model</button><button className="rounded-xl border border-line px-4 py-2 text-ink" onClick={() => { void manager?.useDevice(); }}>Keep this device’s model</button><button className="text-brand" onClick={() => downloadBackup(sync.conflict!.state)}>Download cloud copy</button></div></div>}
  </div>;
}
