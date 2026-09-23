const { safeEqual, sessionToken } = require('./_lib/auth');
const { supabase, visitorId } = require('./_lib/supabase');

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;

// Used only when the Supabase table is unavailable; it lasts as long as one warm server instance.
// Kept on globalThis so it survives the dev server re-loading this file on every request.
const memoryFailures = globalThis.__innieLoginFailures || (globalThis.__innieLoginFailures = new Map());

function cookie(name, value) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`;
}

async function recentFailures(visitor) {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const r = await supabase(
    `innie_admin_login_failures?select=id&visitor=eq.${visitor}&created_at=gte.${encodeURIComponent(since)}`,
    { headers: { Prefer: 'count=exact', Range: '0-0' } }
  );
  if (r && r.ok) {
    const total = Number((r.headers.get('content-range') || '').split('/')[1]);
    if (Number.isFinite(total)) return total;
  }
  const times = (memoryFailures.get(visitor) || []).filter(t => t > Date.now() - WINDOW_MS);
  memoryFailures.set(visitor, times);
  return times.length;
}

async function recordFailure(visitor) {
  const r = await supabase('innie_admin_login_failures', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ visitor })
  });
  if (!r || !r.ok) memoryFailures.set(visitor, [...(memoryFailures.get(visitor) || []), Date.now()]);
}

async function clearFailures(visitor) {
  memoryFailures.delete(visitor);
  await supabase(`innie_admin_login_failures?visitor=eq.${visitor}`, { method: 'DELETE' });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const password = req.body?.password;
  const expected = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!expected || !secret) return res.status(503).json({ error: 'Admin authentication is not configured.' });
  if (!password) return res.status(400).json({ error: 'Enter the admin password.' });

  const visitor = visitorId(req);
  if (await recentFailures(visitor) >= MAX_FAILURES) {
    return res.status(429).json({ error: 'Too many wrong passwords. Try again in 15 minutes.' });
  }

  if (!safeEqual(password, expected)) {
    await recordFailure(visitor);
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  await clearFailures(visitor);
  res.setHeader('Set-Cookie', cookie('innie_admin', sessionToken(password, secret)));
  return res.status(200).json({ ok: true });
};
