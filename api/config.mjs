export default function handler(_req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const authUrl = process.env.NEON_AUTH_BASE_URL ?? process.env.NEON_AUTH_URL;
  if (!authUrl || !process.env.DATABASE_URL) return res.status(503).json({ error: 'Cloud storage is not configured' });
  // This is a public authentication endpoint URL, never a database credential.
  return res.json({ authUrl });
}
