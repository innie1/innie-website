const fs = require('fs');
const path = require('path');
const { supabase, visitorId } = require('./_lib/supabase');
const { deployedProducts } = require('./_lib/content');

function summarize(rows) {
  const count = rows.length;
  const sum = rows.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
  return { average: count > 0 ? parseFloat((sum / count).toFixed(1)) : 0, count };
}

function readLocalRatings() {
  try {
    const filePath = path.join(__dirname, '..', 'data', 'ratings.json');
    return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : [];
  } catch (err) {
    console.error('Error reading local ratings:', err);
    return [];
  }
}

// Local development only; Vercel's file system is read-only, so this returns false there.
// One rating per visitor per product: a repeat rating replaces the earlier one.
function saveLocalRating(slug, voter, rating, comment) {
  try {
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const all = readLocalRatings().filter((r) => !(r.slug === slug && r.voter === voter));
    all.push({ slug, voter, rating, comment, created_at: new Date().toISOString() });
    fs.writeFileSync(path.join(dataDir, 'ratings.json'), JSON.stringify(all, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving local rating:', err);
    return false;
  }
}

module.exports = async (req, res) => {
  // GET: Fetch ratings summary for a product slug
  if (req.method === 'GET') {
    const slug = String(req.query?.slug || '').trim();
    if (!slug) return res.status(400).json({ error: 'Product slug is required.' });

    const response = await supabase(`innie_product_ratings?slug=eq.${encodeURIComponent(slug)}&select=rating`);
    if (response && response.ok) {
      return res.status(200).json({ slug, ...summarize(await response.json()) });
    }
    return res.status(200).json({ slug, ...summarize(readLocalRatings().filter((r) => r.slug === slug)) });
  }

  // POST: Submit or change this visitor's rating
  if (req.method === 'POST') {
    const slug = String(req.body?.slug || '').trim();
    const rating = parseInt(req.body?.rating, 10);
    const comment = String(req.body?.comment || '').trim().slice(0, 500);

    if (!slug) return res.status(400).json({ error: 'Product slug is required.' });
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5 stars.' });
    }
    if (!deployedProducts().some((p) => p.slug === slug)) {
      return res.status(404).json({ error: 'This product is not published.' });
    }

    const voter = visitorId(req);
    const response = await supabase('innie_product_ratings?on_conflict=slug,voter', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ slug, voter, rating, comment, created_at: new Date().toISOString() })
    });
    if (response && response.ok) {
      return res.status(200).json({ ok: true, message: 'Rating submitted successfully.' });
    }
    if (response) console.error('Supabase submit rating error:', await response.text());

    if (saveLocalRating(slug, voter, rating, comment)) {
      return res.status(200).json({ ok: true, message: 'Rating saved.' });
    }
    return res.status(503).json({ error: 'Ratings are unavailable right now. Please try again later.' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
