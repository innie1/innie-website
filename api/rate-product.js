const fs = require('fs');
const path = require('path');

function getLocalRatings(slug) {
  try {
    const dataDir = path.join(__dirname, '..', 'data');
    const filePath = path.join(dataDir, 'ratings.json');
    if (!fs.existsSync(filePath)) return { average: 0, count: 0, ratings: [] };
    const all = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const items = all.filter((r) => r.slug === slug);
    if (items.length === 0) return { average: 0, count: 0, ratings: [] };
    const sum = items.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    const average = parseFloat((sum / items.length).toFixed(1));
    return { average, count: items.length, ratings: items };
  } catch (err) {
    console.error('Error reading local ratings:', err);
    return { average: 0, count: 0, ratings: [] };
  }
}

function saveLocalRating(slug, rating, comment = '') {
  try {
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const filePath = path.join(dataDir, 'ratings.json');
    let all = [];
    if (fs.existsSync(filePath)) {
      try {
        all = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch {
        all = [];
      }
    }
    all.push({
      slug,
      rating: Number(rating),
      comment: String(comment || '').trim().slice(0, 500),
      created_at: new Date().toISOString()
    });
    fs.writeFileSync(filePath, JSON.stringify(all, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving local rating:', err);
    return false;
  }
}

module.exports = async (req, res) => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // GET: Fetch ratings summary for a product slug
  if (req.method === 'GET') {
    const slug = String(req.query?.slug || '').trim();
    if (!slug) return res.status(400).json({ error: 'Product slug is required.' });

    if (url && key) {
      try {
        const response = await fetch(
          `${url.replace(/\/$/, '')}/rest/v1/innie_product_ratings?slug=eq.${encodeURIComponent(slug)}&select=rating`,
          {
            headers: {
              apikey: key,
              Authorization: `Bearer ${key}`,
              Accept: 'application/json'
            }
          }
        );
        if (response.ok) {
          const rows = await response.json();
          const count = rows.length;
          const sum = rows.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
          const average = count > 0 ? parseFloat((sum / count).toFixed(1)) : 0;
          return res.status(200).json({ slug, average, count });
        }
      } catch (err) {
        console.error('Supabase get ratings error:', err);
      }
    }

    const localSummary = getLocalRatings(slug);
    return res.status(200).json({ slug, average: localSummary.average, count: localSummary.count });
  }

  // POST: Submit a new rating
  if (req.method === 'POST') {
    const slug = String(req.body?.slug || '').trim();
    const rating = parseInt(req.body?.rating, 10);
    const comment = String(req.body?.comment || '').trim().slice(0, 500);

    if (!slug) return res.status(400).json({ error: 'Product slug is required.' });
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5 stars.' });
    }

    if (url && key) {
      try {
        const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/innie_product_ratings`, {
          method: 'POST',
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal'
          },
          body: JSON.stringify({ slug, rating, comment })
        });
        if (response.ok) {
          return res.status(200).json({ ok: true, message: 'Rating submitted successfully.' });
        }
      } catch (err) {
        console.error('Supabase submit rating error:', err);
      }
    }

    saveLocalRating(slug, rating, comment);
    return res.status(200).json({ ok: true, message: 'Rating saved.' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
