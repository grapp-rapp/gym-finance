import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type FormEvent } from 'react';
import { isAuthApiError } from '@neondatabase/auth';
import { makeAuthClient, type AuthClient } from './authClient';
export type { AuthClient } from './authClient';
interface Account { id: string; email: string; name: string }
interface AuthValue { client: AuthClient | null; user: Account | null; checking: boolean; open: () => void }
const AuthContext = createContext<AuthValue>({ client: null, user: null, checking: false, open: () => {} });
export const useAccount = () => useContext(AuthContext);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<AuthClient | null>(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    fetch('/api/config', { signal: controller.signal }).then(r => r.ok ? r.json() : null).then(config => {
      // The SDK client is a callable proxy, so wrap it instead of passing it as a React updater.
      if (!cancelled && config?.authUrl) setClient(() => makeAuthClient(config.authUrl));
    }).catch(() => {}).finally(() => { clearTimeout(timeout); if (!cancelled) setChecking(false); });
    return () => { cancelled = true; controller.abort(); clearTimeout(timeout); };
  }, []);
  if (client) return <SignedAccount client={client}>{children}</SignedAccount>;
  return <AuthContext.Provider value={{ client, user: null, checking, open: () => {} }}>{children}</AuthContext.Provider>;
}

function SignedAccount({ client, children }: { client: AuthClient; children: ReactNode }) {
  const { data, isPending, error } = client.useSession();
  const resetToken = new URLSearchParams(window.location.search).get('token');
  const [open, setOpen] = useState(!!resetToken);
  return <AuthContext.Provider value={{ client, user: data?.user ?? null, checking: isPending, open: () => setOpen(true) }}>
    {children}
    {error && <div role="status" className="fixed bottom-6 left-6 z-50 rounded-xl border border-line bg-surface p-4 shadow-lg">Sign-in connection unavailable. Your browser data is safe.</div>}
    {open && <AccountDialog client={client} resetToken={resetToken} close={() => setOpen(false)} />}
  </AuthContext.Provider>;
}

function AccountDialog({ client, resetToken, close }: { client: AuthClient; resetToken: string | null; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset' | 'verify'>(resetToken ? 'reset' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const showFailure = (error: { code?: string; message?: string }) => {
    if (mode === 'login' && ['EMAIL_NOT_VERIFIED', 'email_not_confirmed'].includes(error.code ?? '')) {
      setMode('verify'); setPassword(''); setMessage('Enter the verification code from your email, or request a new code below.');
    } else { setFailed(true); setMessage(error.message ?? 'Please try again.'); }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage(''); setFailed(false);
    try {
      const result = mode === 'verify' ? await client.emailOtp.verifyEmail({ email, otp })
        : mode === 'login' ? await client.signIn.email({ email, password })
        : mode === 'signup' ? await client.signUp.email({ email, password, name, callbackURL: window.location.origin })
        : mode === 'forgot' ? await client.requestPasswordReset({ email, redirectTo: window.location.origin })
        : await client.resetPassword({ newPassword: password, token: resetToken ?? '' });
      if (result.error) showFailure(result.error);
      else if (mode === 'forgot') setMessage('If an account exists, a password reset email has been sent.');
      else if (mode === 'reset') { window.history.replaceState(null, '', '/#/dashboard'); setMode('login'); setMessage('Password updated. You can now sign in.'); }
      else if (mode === 'signup') {
        const session = await client.getSession();
        if (session.data?.user) close();
        else { setMode('verify'); setPassword(''); setMessage('We sent a verification code to your email. Enter it below. Your browser setup is safe.'); }
      } else if (mode === 'verify') {
        const session = await client.getSession();
        if (session.data?.user) close();
        else { setMode('login'); setMessage('Email verified. You can now sign in.'); }
      } else close();
    } catch (error) {
      if (isAuthApiError(error)) showFailure(error);
      else { setFailed(true); setMessage('Could not connect. Please try again.'); }
    }
    finally { setBusy(false); }
  };
  const resend = async () => {
    setBusy(true); setMessage(''); setFailed(false);
    try {
      const result = await client.emailOtp.sendVerificationOtp({ email, type: 'email-verification' });
      setFailed(!!result.error); setMessage(result.error?.message ?? 'A new verification code has been sent.');
    } catch (error) { setFailed(true); setMessage(isAuthApiError(error) ? error.message : 'Could not send a code. Please try again.'); }
    finally { setBusy(false); }
  };
  const title = mode === 'verify' ? 'Verify your email' : mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : mode === 'reset' ? 'Choose a new password' : 'Sign in to your model';
  const input = 'w-full rounded-xl border border-line bg-white px-3 py-2.5 text-ink focus:outline-brand';
  return <dialog ref={dialog} aria-labelledby="account-title" onCancel={e => { e.preventDefault(); if (!busy) close(); }} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-white p-6 shadow-xl backdrop:bg-black/35">
      <div className="flex items-center justify-between gap-4"><h2 id="account-title" className="text-xl font-semibold text-ink">{title}</h2><button aria-label="Close sign-in" type="button" disabled={busy} onClick={close} className="p-2 text-muted">✕</button></div>
      <p className="mt-2 text-sm text-muted">Save your gym model and pick up on any computer. Your existing browser setup will be imported when you first sign in.</p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        {mode === 'signup' && <label className="block text-sm text-ink">Name<input required autoComplete="name" className={input} value={name} onChange={e => setName(e.target.value)} /></label>}
        {mode !== 'reset' && <label className="block text-sm text-ink">Email<input autoFocus={mode !== 'verify'} readOnly={mode === 'verify'} required type="email" autoComplete="email" className={input} value={email} onChange={e => setEmail(e.target.value)} /></label>}
        {mode === 'verify' && <label className="block text-sm text-ink">Verification code<input autoFocus required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" className={input} value={otp} onChange={e => setOtp(e.target.value)} /><span className="text-xs text-muted">Enter the six-digit code sent to your email.</span></label>}
        {mode !== 'forgot' && mode !== 'verify' && <label className="block text-sm text-ink">Password<input required type="password" minLength={mode === 'login' ? 1 : 12} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className={input} value={password} onChange={e => setPassword(e.target.value)} />{mode !== 'login' && <span className="text-xs text-muted">Use at least 12 characters.</span>}</label>}
        {message && <p role={failed ? 'alert' : 'status'} className={failed ? 'text-sm text-bad' : 'text-sm text-ink'}>{message}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-xl bg-brand px-4 py-3 font-medium text-white disabled:opacity-50">{busy ? 'Please wait…' : mode === 'verify' ? 'Verify email' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset email' : mode === 'reset' ? 'Update password' : 'Sign in'}</button>
      </form>
      <div className="mt-4 flex flex-wrap justify-between gap-3 text-sm text-brand">
        <button type="button" disabled={busy} onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); setPassword(''); setOtp(''); }}>{mode === 'login' ? 'Create an account' : 'Back to sign in'}</button>
        {mode === 'verify' && <button type="button" disabled={busy} onClick={() => { void resend(); }}>Resend code</button>}
        {mode === 'login' && <button type="button" disabled={busy} onClick={() => { setMode('forgot'); setMessage(''); }}>Forgot password?</button>}
      </div>
  </dialog>;
}
