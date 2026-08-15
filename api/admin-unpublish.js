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

async function gh(apiPath, options = {}) {
  const r = await fetch(`https://api.github.com${apiPath}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.message || 'GitHub request failed');
  return data;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!authOk(req)) return res.status(401).json({ error: 'Not authenticated.' });

  try {
    const slug = String(req.body?.slug || '').trim();
    if (!slug) return res.status(400).json({ error: 'Slug is required.' });

    // In production with GITHUB_TOKEN
    if (process.env.GITHUB_TOKEN) {
      const file = await gh(`/repos/${repo}/contents/content.js?ref=${encodeURIComponent(branch)}`);
      const text = Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString('utf8');
      const marker = 'window.INNIE_PRODUCTS = ';
      const start = text.indexOf(marker);
      const end = text.indexOf('];', start);
      if (start < 0 || end < 0) throw new Error('Invalid content.js model.');
      const products = JSON.parse(text.slice(start + marker.length, end + 1));
      const nextProducts = products.filter(item => item.slug !== slug);
      if (nextProducts.length === products.length) return res.status(404).json({ error: 'Product/service not found.' });

      const next = `// INNIE content source of truth.\n// Automatically maintained by the INNIE Publishing API.\nwindow.INNIE_PRODUCTS = ${JSON.stringify(nextProducts, null, 2)};\n`;
      await gh(`/repos/${repo}/contents/content.js`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Unpublish ${slug}`, content: Buffer.from(next).toString('base64'), sha: file.sha, branch })
      });
      return res.status(200).json({ ok: true });
    }

    // Local filesystem fallback
    const contentFilePath = path.join(__dirname, '..', 'content.js');
    if (fs.existsSync(contentFilePath)) {
      const text = fs.readFileSync(contentFilePath, 'utf8');
      const marker = 'window.INNIE_PRODUCTS = ';
      const start = text.indexOf(marker);
      const end = text.indexOf('];', start);
      if (start >= 0 && end >= 0) {
        const products = JSON.parse(text.slice(start + marker.length, end + 1));
        const nextProducts = products.filter(item => item.slug !== slug);
        const next = `// INNIE content source of truth.\n// Automatically maintained by the INNIE Publishing API.\nwindow.INNIE_PRODUCTS = ${JSON.stringify(nextProducts, null, 2)};\n`;
        fs.writeFileSync(contentFilePath, next, 'utf8');
        return res.status(200).json({ ok: true });
      }
    }

    return res.status(404).json({ error: 'Product/service not found.' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
