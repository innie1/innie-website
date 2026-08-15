const crypto = require('crypto');

const repo = process.env.GITHUB_REPO || 'innie1/innie-website';
const branch = process.env.GITHUB_BRANCH || 'main11';
const api = 'https://api.github.com';

function json(res, status, body) { return res.status(status).json(body); }
function authOk(req) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  const password = process.env.ADMIN_PASSWORD;
  const cookies = Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(v => {
    const i = v.indexOf('='); return [v.slice(0, i).trim(), decodeURIComponent(v.slice(i + 1).trim())];
  }));
  if (!secret || !password || !cookies.innie_admin) return false;
  const expected = crypto.createHmac('sha256', secret).update(password).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(cookies.innie_admin), Buffer.from(expected));
}
function slugify(value) {
  return String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}
async function gh(path, options = {}) {
  const response = await fetch(`${api}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(options.headers || {}) }
  });
  const text = await response.text();
  let data; try { data = JSON.parse(text); } catch { data = { text }; }
  if (!response.ok) throw new Error(data.message || `GitHub request failed (${response.status})`);
  return data;
}
function decodeImage(dataUrl) {
  const match = /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!match) throw new Error('Images must be PNG, JPEG, WebP or GIF uploads.');
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > 3 * 1024 * 1024) throw new Error('Each image must be 3 MB or smaller.');
  const ext = match[1].replace('jpeg', 'jpg').replace('image/', '');
  return { bytes, ext };
}
async function upsertFile(path, bytesOrText, message) {
  let sha;
  try { sha = (await gh(`/repos/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`)).sha; } catch (e) { if (!String(e.message).includes('Not Found')) throw e; }
  const content = Buffer.isBuffer(bytesOrText) ? bytesOrText.toString('base64') : Buffer.from(bytesOrText, 'utf8').toString('base64');
  const body = { message, content, branch };
  if (sha) body.sha = sha;
  return gh(`/repos/${repo}/contents/${path.split('/').map(encodeURIComponent).join('/')}`, { method: 'PUT', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!authOk(req)) return json(res, 401, { error: 'Not authenticated.' });
  if (!process.env.GITHUB_TOKEN) return json(res, 503, { error: 'GITHUB_TOKEN is not configured.' });

  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const type = body.type === 'service' ? 'service' : 'product';
    const status = body.status === 'Live' ? 'Live' : 'Coming Soon';
    const slug = slugify(body.slug || name);
    if (!name || !slug) return json(res, 400, { error: 'Product/service name is required.' });

    const base = `assets/${slug}`;
    let heroImage = '';
    if (body.heroImage) {
      const image = decodeImage(body.heroImage);
      const path = `${base}/hero.${image.ext}`;
      await upsertFile(path, image.bytes, `Add ${name} hero image`);
      heroImage = path;
    }

    const screenshots = [];
    for (let i = 0; i < Math.min(Array.isArray(body.screenshots) ? body.screenshots.length : 0, 12); i++) {
      const image = decodeImage(body.screenshots[i]);
      const path = `${base}/screenshot-${String(i + 1).padStart(2, '0')}.${image.ext}`;
      await upsertFile(path, image.bytes, `Add ${name} screenshot ${i + 1}`);
      screenshots.push(path);
    }

    const current = await gh(`/repos/${repo}/contents/content.js?ref=${encodeURIComponent(branch)}`);
    const currentText = Buffer.from(current.content.replace(/\n/g, ''), 'base64').toString('utf8');
    const marker = 'window.INNIE_PRODUCTS = ';
    const start = currentText.indexOf(marker);
    if (start < 0) throw new Error('content.js does not contain the expected product model.');
    const arrayStart = start + marker.length;
    const arrayEnd = currentText.indexOf('];', arrayStart);
    if (arrayEnd < 0) throw new Error('Could not locate product list in content.js.');
    let products;
    try { products = JSON.parse(currentText.slice(arrayStart, arrayEnd + 1)); } catch { products = []; }

    const product = {
      slug, name, type, status,
      shortDescription: String(body.shortDescription || '').trim(),
      description: String(body.description || '').trim(),
      heroImage,
      screenshots,
      appUrl: String(body.appUrl || '').trim()
    };
    const index = products.findIndex(item => item.slug === slug);
    if (index >= 0) products[index] = product; else products.push(product);
    const next = `// This file is managed by the INNIE publishing dashboard.\nwindow.INNIE_PRODUCTS = ${JSON.stringify(products, null, 2)};\n`;
    await upsertFile('content.js', next, `${index >= 0 ? 'Update' : 'Publish'} ${name}`);

    return json(res, 200, { ok: true, product, message: index >= 0 ? 'Product/service updated.' : 'Product/service published.' });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: error.message || 'Publishing failed.' });
  }
};
