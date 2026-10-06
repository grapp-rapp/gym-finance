import { createRemoteJWKSet, jwtVerify } from 'jose';
import { readModel, saveModel } from '../server/database.mjs';
import { validPlan } from '../server/validation.mjs';
let jwks;
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!['GET','PUT'].includes(req.method)) { res.setHeader('Allow','GET, PUT'); return res.status(405).json({ error: 'Method not allowed' }); }
  const authUrl = process.env.NEON_AUTH_BASE_URL ?? process.env.NEON_AUTH_URL;
  if (!authUrl || !process.env.DATABASE_URL) return res.status(503).json({ error: 'Cloud storage is not configured' });
  const token = req.headers.authorization;
  if (!token?.startsWith('Bearer ')) return res.status(401).json({ error: 'Sign in to access your model' });
  let userId;
  try {
    jwks ??= createRemoteJWKSet(new URL(process.env.NEON_AUTH_JWKS_URL ?? `${authUrl.replace(/\/$/,'')}/.well-known/jwks.json`));
    const { payload } = await jwtVerify(token.slice(7), jwks, { issuer: new URL(authUrl).origin, requiredClaims: ['sub','exp','iat'] });
    if (typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 200) throw new Error('Invalid identity');
    userId = payload.sub;
  } catch { return res.status(401).json({ error: 'Your sign-in expired. Please sign in again.' }); }
  try {
    if (req.method === 'GET') return res.json({ model: await readModel(userId) });
    if (Number(req.headers['content-length'] ?? 0) > 250000) return res.status(413).json({ error: 'Model is too large' });
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid model' }); } }
    if (JSON.stringify(body ?? '').length > 250000 || !Number.isSafeInteger(body?.revision) || body.revision < 0 || !validPlan(body?.state)) return res.status(400).json({ error: 'Invalid saved model. Download a backup and contact support.' });
    const model = await saveModel(userId, body.state, body.revision);
    if (!model) return res.status(409).json({ error: 'Model changed on another device', model: await readModel(userId) });
    return res.json({ model });
  } catch { return res.status(503).json({ error: 'Cloud saving is temporarily unavailable. Your device copy is safe.' }); }
}
