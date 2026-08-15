const fs = require('fs');
const path = require('path');

// Ensure local data directory exists for local testing fallback
function saveSubscriberLocally(email) {
  try {
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const filePath = path.join(dataDir, 'subscribers.json');
    let subscribers = [];
    if (fs.existsSync(filePath)) {
      try {
        subscribers = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch {
        subscribers = [];
      }
    }
    const existing = subscribers.find((s) => s.email === email);
    if (!existing) {
      subscribers.push({
        email,
        created_at: new Date().toISOString()
      });
      fs.writeFileSync(filePath, JSON.stringify(subscribers, null, 2), 'utf8');
    }
    return true;
  } catch (err) {
    console.error('Local subscriber save error:', err);
    return false;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // If Supabase credentials are configured, save to Supabase
  if (url && key) {
    try {
      const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/innie_subscribers`, {
        method: 'POST',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('Supabase subscription error:', text);
        return res.status(500).json({ error: 'Could not save your email right now.' });
      }

      return res.status(200).json({ ok: true, message: 'Subscribed successfully.' });
    } catch (err) {
      console.error('Supabase request failed:', err);
      return res.status(500).json({ error: 'Database connection failed.' });
    }
  }

  // Fallback for local development or when Supabase is not configured yet
  const saved = saveSubscriberLocally(email);
  if (saved) {
    console.log(`[Local Subscription] New subscriber email received: ${email}`);
    return res.status(200).json({ 
      ok: true, 
      message: 'Subscribed successfully (saved to local development storage).' 
    });
  }

  return res.status(503).json({ error: 'Email collection service is not ready.' });
};
