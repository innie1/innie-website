const crypto = require('crypto');

function cookie(name, value) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`;
}

module.exports = (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const password = req.body?.password;
  const expected = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!expected || !secret || !password) return res.status(503).json({ error: 'Admin authentication is not configured.' });
  if (password !== expected) return res.status(401).json({ error: 'Incorrect password.' });

  const token = crypto.createHmac('sha256', secret).update(password).digest('hex');
  res.setHeader('Set-Cookie', cookie('innie_admin', token));
  return res.status(200).json({ ok: true });
};
