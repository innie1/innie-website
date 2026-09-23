const crypto = require('crypto');

// Files under api/_lib are shared helpers; Vercel does not expose them as endpoints.

function sessionToken(password, secret) {
  return crypto.createHmac('sha256', secret).update(password).digest('hex');
}

// Compares two strings without leaking how many leading characters match.
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function readCookie(req, name) {
  const found = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`));
  if (!found) return '';
  try { return decodeURIComponent(found.slice(name.length + 1)); } catch { return ''; }
}

function authOk(req) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const password = process.env.ADMIN_PASSWORD;
  const token = readCookie(req, 'innie_admin');
  if (!secret || !password || !token) return false;
  return safeEqual(token, sessionToken(password, secret));
}

module.exports = { authOk, safeEqual, sessionToken };
