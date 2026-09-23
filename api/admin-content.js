const { authOk } = require('./_lib/auth');
const { LOCAL_FILE, parseProducts } = require('./_lib/content');
const fs = require('fs');

const repo = process.env.GITHUB_REPO || 'innie1/innie-website';
const branch = process.env.GITHUB_BRANCH || 'main11';

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
      return res.status(200).json({ products: parseProducts(text) || [] });
    } catch (e) {
      console.warn('GitHub content fetch error:', e.message);
    }
  }

  // Local filesystem fallback
  try {
    if (!fs.existsSync(LOCAL_FILE)) return res.status(200).json({ products: [] });
    return res.status(200).json({ products: parseProducts(fs.readFileSync(LOCAL_FILE, 'utf8')) || [] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
