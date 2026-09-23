const { authOk } = require('./_lib/auth');
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!authOk(req)) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url && key) {
    try {
      const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/innie_subscribers?select=*&order=created_at.desc`, {
        method: 'GET',
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch subscribers from Supabase.');
      }
      const subscribers = await response.json();
      return res.status(200).json({ subscribers });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  }

  // Fallback to local data file
  const filePath = path.join(__dirname, '..', 'data', 'subscribers.json');
  if (fs.existsSync(filePath)) {
    try {
      const subscribers = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return res.status(200).json({ subscribers });
    } catch {
      return res.status(200).json({ subscribers: [] });
    }
  }

  return res.status(200).json({ subscribers: [] });
};
