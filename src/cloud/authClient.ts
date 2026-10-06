import { BetterAuthReactAdapter } from '@neondatabase/auth/react/adapters';

const tokenReaders = new WeakMap<object, () => Promise<string | null>>();
export function makeAuthClient(url: string) {
  const adapter = BetterAuthReactAdapter()(url);
  const client = adapter.getBetterAuthInstance();
  tokenReaders.set(client, () => adapter.getJWTToken(false));
  return client;
}
export type AuthClient = ReturnType<typeof makeAuthClient>;
export async function getAuthToken(client: AuthClient) {
  const read = tokenReaders.get(client);
  if (!read) throw new Error('Please sign in again.');
  return read();
}
