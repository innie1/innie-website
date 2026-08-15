const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

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

function saveLocally(productData, heroImageUpload, screenshotUploads, isEdit) {
  const assetsDir = path.join(__dirname, '..', 'assets');
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  let heroImagePath = productData.heroImage || '';
  if (heroImageUpload) {
    const { bytes, ext } = decodeImage(heroImageUpload);
    const fileName = `${productData.slug}-hero.${ext}`;
    fs.writeFileSync(path.join(assetsDir, fileName), bytes);
    heroImagePath = `assets/${fileName}`;
  }

  const screenshots = (productData.screenshots || []).slice();
  if (screenshotUploads && screenshotUploads.length > 0) {
    screenshotUploads.forEach((dataUrl, i) => {
      const { bytes, ext } = decodeImage(dataUrl);
      const fileName = `${productData.slug}-shot-${i + 1}.${ext}`;
      fs.writeFileSync(path.join(assetsDir, fileName), bytes);
      screenshots.push(`assets/${fileName}`);
    });
  }

  const contentFilePath = path.join(__dirname, '..', 'content.js');
  let products = [];
  if (fs.existsSync(contentFilePath)) {
    const text = fs.readFileSync(contentFilePath, 'utf8');
    const marker = 'window.INNIE_PRODUCTS = ';
    const start = text.indexOf(marker);
    const end = text.indexOf('];', start);
    if (start >= 0 && end >= 0) {
      try {
        products = JSON.parse(text.slice(start + marker.length, end + 1));
      } catch {
        products = [];
      }
    }
  }

  const newProduct = {
    ...productData,
    heroImage: heroImagePath,
    screenshots,
    updatedAt: new Date().toISOString()
  };

  const existingIdx = products.findIndex(p => p.slug === newProduct.slug);
  if (existingIdx >= 0) {
    products[existingIdx] = newProduct;
  } else {
    products.unshift(newProduct);
  }

  const newContentJs = `// INNIE content source of truth.\n// Automatically maintained by the INNIE Publishing API.\nwindow.INNIE_PRODUCTS = ${JSON.stringify(products, null, 2)};\n`;
  fs.writeFileSync(contentFilePath, newContentJs, 'utf8');
  return newProduct;
}

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

    // In production with GITHUB_TOKEN
    if (process.env.GITHUB_TOKEN) {
      let heroImage = body.heroImage || '';
      if (heroImageUpload) {
        const { bytes, ext } = decodeImage(heroImageUpload);
        heroImage = `assets/${slug}-hero.${ext}`;
        await upsertFile(heroImage, bytes, `Upload hero image for ${name}`);
      }

      const screenshots = Array.isArray(body.screenshots) ? body.screenshots.slice() : [];
      for (let i = 0; i < screenshotUploads.length; i += 1) {
        const { bytes, ext } = decodeImage(screenshotUploads[i]);
        const imagePath = `assets/${slug}-shot-${i + 1}.${ext}`;
        await upsertFile(imagePath, bytes, `Upload screenshot ${i + 1} for ${name}`);
        screenshots.push(imagePath);
      }

      let products = [];
      try {
        const file = await gh(`/repos/${repo}/contents/content.js?ref=${encodeURIComponent(branch)}`);
        const text = Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString('utf8');
        const marker = 'window.INNIE_PRODUCTS = ';
        const start = text.indexOf(marker);
        const end = text.indexOf('];', start);
        if (start >= 0 && end >= 0) products = JSON.parse(text.slice(start + marker.length, end + 1));
      } catch (err) {
        console.warn('Could not read existing content from GitHub:', err.message);
      }

      const item = {
        name,
        type,
        status,
        slug,
        appUrl,
        shortDescription,
        description,
        heroImage,
        screenshots,
        updatedAt: new Date().toISOString()
      };

      const existingIndex = products.findIndex(p => p.slug === (editingSlug || slug));
      if (existingIndex >= 0) {
        products[existingIndex] = item;
      } else {
        products.unshift(item);
      }

      const newContentJs = `// INNIE content source of truth.\n// Automatically maintained by the INNIE Publishing API.\nwindow.INNIE_PRODUCTS = ${JSON.stringify(products, null, 2)};\n`;
      await upsertFile('content.js', newContentJs, `${editingSlug ? 'Update' : 'Publish'} ${name}`);

      return json(res, 200, { ok: true, slug, product: item });
    }

    // Local filesystem fallback
    const saved = saveLocally(
      { name, type, status, slug, appUrl, shortDescription, description, heroImage: body.heroImage, screenshots: body.screenshots },
      heroImageUpload,
      screenshotUploads,
      Boolean(editingSlug)
    );

    return json(res, 200, { ok: true, slug, product: saved });
  } catch (error) {
    console.error('Publish error:', error);
    return json(res, 500, { error: error.message || 'Publishing failed.' });
  }
};
