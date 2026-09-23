const crypto = require('crypto');

function configured() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Calls the Supabase REST API with the server-side key.
// Returns null when Supabase is not configured or the request could not be sent.
async function supabase(apiPath, options = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  const url = (process.env.SUPABASE_URL || 'https://skojozxjeoobakrubnuj.supabase.co').replace(/\/$/, '');
  try {
    return await fetch(`${url}/rest/v1/${apiPath}`, {
      ...options,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      }
    });
  } catch (err) {
    console.error(`[Supabase ${apiPath}]`, err);
    return null;
  }
}

// Vercel sets x-real-ip / x-forwarded-for itself, so visitors cannot spoof them there.
function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return String(req.headers['x-real-ip'] || '').trim() || forwarded || req.socket?.remoteAddress || 'unknown';
}

// A one-way fingerprint of the visitor's IP, so raw addresses are never stored.
function visitorId(req) {
  const salt = process.env.VISITOR_SALT || process.env.ADMIN_SESSION_SECRET || 'innie-website';
  return crypto.createHash('sha256').update(`${salt}:${clientIp(req)}`).digest('hex').slice(0, 32);
}

module.exports = { configured, supabase, visitorId };
