const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function authOk(req) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const password = process.env.ADMIN_PASSWORD;
  const cookies = Object.fromEntries(
    (req.headers.cookie || '')
      .split(';')
      .filter(Boolean)
      .map((v) => {
        const i = v.indexOf('=');
        return [v.slice(0, i).trim(), decodeURIComponent(v.slice(i + 1).trim())];
      })
  );
  if (!secret || !password || !cookies.innie_admin) return false;
  const expected = crypto.createHmac('sha256', secret).update(password).digest('hex');
  return (
    cookies.innie_admin.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(cookies.innie_admin), Buffer.from(expected))
  );
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!authOk(req)) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && key) {
    try {
      const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/innie_subscribers?select=*&order=created_at.desc`, {
        method: 'GET',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch subscribers from Supabase.');
      }
      const subscribers = await response.json();
      return res.status(200).json({ subscribers });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  }

  // Fallback to local data file
  const filePath = path.join(__dirname, '..', 'data', 'subscribers.json');
  if (fs.existsSync(filePath)) {
    try {
      const subscribers = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return res.status(200).json({ subscribers });
    } catch {
      return res.status(200).json({ subscribers: [] });
    }
  }

  return res.status(200).json({ subscribers: [] });
};
