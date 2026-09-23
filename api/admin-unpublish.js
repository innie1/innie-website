const { authOk } = require('./_lib/auth');
const { LOCAL_FILE, parseProducts, serializeProducts } = require('./_lib/content');
const fs = require('fs');

const repo = process.env.GITHUB_REPO || 'innie1/innie-website';
const branch = process.env.GITHUB_BRANCH || 'main11';

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
      const products = parseProducts(Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString('utf8'));
      if (!products) throw new Error('Invalid content.js model.');
      const nextProducts = products.filter(item => item.slug !== slug);
      if (nextProducts.length === products.length) return res.status(404).json({ error: 'Product/service not found.' });

      const next = serializeProducts(nextProducts);
      await gh(`/repos/${repo}/contents/content.js`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Unpublish ${slug}`, content: Buffer.from(next).toString('base64'), sha: file.sha, branch })
      });
      return res.status(200).json({ ok: true });
    }

    // Local filesystem fallback
    if (fs.existsSync(LOCAL_FILE)) {
      const products = parseProducts(fs.readFileSync(LOCAL_FILE, 'utf8'));
      if (products && products.some(item => item.slug === slug)) {
        fs.writeFileSync(LOCAL_FILE, serializeProducts(products.filter(item => item.slug !== slug)), 'utf8');
        return res.status(200).json({ ok: true });
      }
    }

    return res.status(404).json({ error: 'Product/service not found.' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
