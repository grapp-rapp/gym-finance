import { neon } from '@neondatabase/serverless';
let client;
let schema;
export async function database() {
  if (!process.env.DATABASE_URL) throw new Error('Database not configured');
  client ??= neon(process.env.DATABASE_URL);
  schema ??= client.transaction([
    client`CREATE TABLE IF NOT EXISTS gym_models (user_id text PRIMARY KEY, state jsonb NOT NULL, revision integer NOT NULL CHECK (revision > 0), updated_at timestamptz NOT NULL DEFAULT now())`,
    client`CREATE TABLE IF NOT EXISTS gym_model_history (user_id text NOT NULL, revision integer NOT NULL, state jsonb NOT NULL, saved_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id, revision))`,
  ]).catch(error => { schema = undefined; throw error; });
  await schema;
  return client;
}
export function toRecord(row) { return row ? { state: row.state, revision: row.revision, updatedAt: row.updated_at } : null; }
export async function readModel(userId) { const sql = await database(); const rows = await sql`SELECT state, revision, updated_at FROM gym_models WHERE user_id = ${userId}`; return toRecord(rows[0]); }
export async function saveModel(userId, state, revision) {
  const sql = await database();
  // Revision 0 can only create. Updates must match the last acknowledged revision.
  const rows = revision === 0
    ? await sql`WITH saved AS (INSERT INTO gym_models(user_id, state, revision) VALUES (${userId}, ${JSON.stringify(state)}::jsonb, 1) ON CONFLICT DO NOTHING RETURNING *), archived AS (INSERT INTO gym_model_history(user_id, revision, state) SELECT user_id, revision, state FROM saved) SELECT state, revision, updated_at FROM saved`
    : await sql`WITH saved AS (UPDATE gym_models SET state = ${JSON.stringify(state)}::jsonb, revision = revision + 1, updated_at = now() WHERE user_id = ${userId} AND revision = ${revision} RETURNING *), archived AS (INSERT INTO gym_model_history(user_id, revision, state) SELECT user_id, revision, state FROM saved) SELECT state, revision, updated_at FROM saved`;
  if (!rows.length) return null;
  // Keep the latest 30 successful snapshots per account.
  try { await sql`DELETE FROM gym_model_history WHERE user_id = ${userId} AND revision < ${rows[0].revision - 29}`; } catch { /* A confirmed save remains successful if history pruning is temporarily unavailable. */ }
  return toRecord(rows[0]);
}
