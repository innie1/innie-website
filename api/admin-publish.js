const { authOk } = require('./_lib/auth');
const { LOCAL_FILE, parseProducts, serializeProducts } = require('./_lib/content');
const fs = require('fs');
const path = require('path');

const repo = process.env.GITHUB_REPO || 'innie1/innie-website';
const branch = process.env.GITHUB_BRANCH || 'main11';
const api = 'https://api.github.com';

function json(res, status, body) { return res.status(status).json(body); }

function slugify(value) {
  return String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

async function gh(apiPath, options = {}) {
  const response = await fetch(`${api}${apiPath}`, {
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

async function upsertFile(filePath, bytesOrText, message) {
  let sha;
  try { 
    sha = (await gh(`/repos/${repo}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(branch)}`)).sha; 
  } catch (e) { 
    if (!String(e.message).includes('Not Found')) throw e; 
  }
  const content = Buffer.isBuffer(bytesOrText) ? bytesOrText.toString('base64') : Buffer.from(bytesOrText, 'utf8').toString('base64');
  const body = { message, content, branch };
  if (sha) body.sha = sha;
  return gh(`/repos/${repo}/contents/${filePath.split('/').map(encodeURIComponent).join('/')}`, { 
    method: 'PUT', 
    body: JSON.stringify(body), 
    headers: { 'Content-Type': 'application/json' } 
  });
}

const MAX_SCREENSHOTS = 12;

// Only image paths this dashboard created are kept from the request.
function assetPath(value) {
  return typeof value === 'string' && /^assets\/[A-Za-z0-9._-]+$/.test(value) ? value : null;
}

// Where content.js and images are written: GitHub in production, this folder in local development.
const githubStore = {
  async readProducts() {
    try {
      const file = await gh(`/repos/${repo}/contents/content.js?ref=${encodeURIComponent(branch)}`);
      return parseProducts(Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString('utf8')) || [];
    } catch (err) {
      console.warn('Could not read existing content from GitHub:', err.message);
      return [];
    }
  },
  writeImage: (filePath, bytes, message) => upsertFile(filePath, bytes, message),
  writeProducts: (products, message) => upsertFile('content.js', serializeProducts(products), message)
};

const localStore = {
  async readProducts() {
    try { return parseProducts(fs.readFileSync(LOCAL_FILE, 'utf8')) || []; } catch { return []; }
  },
  async writeImage(filePath, bytes) {
    const full = path.join(__dirname, '..', filePath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, bytes);
  },
  async writeProducts(products) {
    fs.writeFileSync(LOCAL_FILE, serializeProducts(products), 'utf8');
  }
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!authOk(req)) return json(res, 401, { error: 'Not authenticated.' });

  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const type = body.type === 'service' ? 'service' : 'product';
    const status = body.status === 'Live' ? 'Live' : 'Coming Soon';
    const slug = slugify(body.slug || name);
    if (!name || !slug) return json(res, 400, { error: 'Product/service name is required.' });

    const shortDescription = String(body.shortDescription || '').trim();
    const description = String(body.description || '').trim();
    const appUrl = String(body.appUrl || '').trim();
    const heroImageUpload = body.heroImageUpload || null;
    const screenshotUploads = Array.isArray(body.screenshotUploads) ? body.screenshotUploads : [];
    const editingSlug = body.editingSlug ? String(body.editingSlug).trim() : null;

    const store = process.env.GITHUB_TOKEN ? githubStore : localStore;
    const products = await store.readProducts();
    const existingIndex = editingSlug ? products.findIndex(p => p.slug === editingSlug) : -1;
    const existing = existingIndex >= 0 ? products[existingIndex] : null;

    // Never let a new or renamed item silently replace a different one.
    if (products.some((p, i) => p.slug === slug && i !== existingIndex)) {
      return json(res, 409, { error: `Another product or service already uses the name "${name}". Choose a different name.` });
    }

    // Keep the current images unless the request says otherwise, so editing text never drops them.
    let heroImage = body.heroImage !== undefined ? (assetPath(body.heroImage) || '') : (existing?.heroImage || '');
    const screenshots = (Array.isArray(body.screenshots) ? body.screenshots : (existing?.screenshots || []))
      .map(assetPath).filter(Boolean);
    if (screenshots.length + screenshotUploads.length > MAX_SCREENSHOTS) {
      return json(res, 400, { error: `A product can have at most ${MAX_SCREENSHOTS} screenshots.` });
    }

    // Decode everything first so a bad file fails before anything is written.
    const hero = heroImageUpload ? decodeImage(heroImageUpload) : null;
    const shots = screenshotUploads.map(decodeImage);

    // A fresh name per upload: never overwrites an earlier image, and browsers never show a stale cached copy.
    const stamp = Date.now().toString(36);
    if (hero) {
      heroImage = `assets/${slug}-hero-${stamp}.${hero.ext}`;
      await store.writeImage(heroImage, hero.bytes, `Upload hero image for ${name}`);
    }
    for (let i = 0; i < shots.length; i += 1) {
      const imagePath = `assets/${slug}-shot-${stamp}-${i + 1}.${shots[i].ext}`;
      await store.writeImage(imagePath, shots[i].bytes, `Upload screenshot ${screenshots.length + 1} for ${name}`);
      screenshots.push(imagePath);
    }

    const item = { name, type, status, slug, appUrl, shortDescription, description, heroImage, screenshots, updatedAt: new Date().toISOString() };
    if (existingIndex >= 0) products[existingIndex] = item;
    else products.unshift(item);

    await store.writeProducts(products, `${existing ? 'Update' : 'Publish'} ${name}`);
    return json(res, 200, { ok: true, slug, product: item });
  } catch (error) {
    console.error('Publish error:', error);
    return json(res, 500, { error: error.message || 'Publishing failed.' });
  }
};
