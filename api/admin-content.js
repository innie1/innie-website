const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const repo = process.env.GITHUB_REPO || 'innie1/innie-website';
const branch = process.env.GITHUB_BRANCH || 'main11';

function authOk(req) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const password = process.env.ADMIN_PASSWORD;
  const cookie = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith('innie_admin='));
  const token = cookie ? decodeURIComponent(cookie.slice('innie_admin='.length)) : '';
  if (!secret || !password || !token) return false;
  const expected = crypto.createHmac('sha256', secret).update(password).digest('hex');
  return token.length === expected.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

async function gh(apiPath) {
  const r = await fetch(`https://api.github.com${apiPath}`, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.message || 'GitHub request failed');
  return data;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!authOk(req)) return res.status(401).json({ error: 'Not authenticated.' });

  // If GITHUB_TOKEN is configured, load from GitHub
  if (process.env.GITHUB_TOKEN) {
    try {
      const file = await gh(`/repos/${repo}/contents/content.js?ref=${encodeURIComponent(branch)}`);
      const text = Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString('utf8');
      const marker = 'window.INNIE_PRODUCTS = ';
      const start = text.indexOf(marker);
      const end = text.indexOf('];', start);
      const products = start >= 0 && end >= 0 ? JSON.parse(text.slice(start + marker.length, end + 1)) : [];
      return res.status(200).json({ products });
    } catch (e) {
      console.warn('GitHub content fetch error:', e.message);
    }
  }

  // Local filesystem fallback
  try {
    const contentFilePath = path.join(__dirname, '..', 'content.js');
    if (fs.existsSync(contentFilePath)) {
      const text = fs.readFileSync(contentFilePath, 'utf8');
      const marker = 'window.INNIE_PRODUCTS = ';
      const start = text.indexOf(marker);
      const end = text.indexOf('];', start);
      const products = start >= 0 && end >= 0 ? JSON.parse(text.slice(start + marker.length, end + 1)) : [];
      return res.status(200).json({ products });
    }
    return res.status(200).json({ products: [] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
