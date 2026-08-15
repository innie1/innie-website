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

// Send instant email notification via Resend API
async function sendResendNotification(subscriberEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const toEmail = process.env.NOTIFICATION_EMAIL || 'inniegroup@gmail.com';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'INNIE Updates <onboarding@resend.dev>';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: `🎉 New Subscriber on INNIE Website: ${subscriberEmail}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <h2 style="color: #00A3FF; margin-top: 0; font-size: 22px;">INNIE GROUP</h2>
            <p style="font-size: 16px; color: #0f172a; line-height: 1.5;">You received a new email subscriber from your website landing page!</p>
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #64748b;"><strong>Subscriber Email:</strong></p>
              <p style="margin: 6px 0 0; font-size: 18px; color: #00A3FF; font-weight: bold;">${subscriberEmail}</p>
            </div>
            <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">Time (UTC): ${new Date().toUTCString()}</p>
          </div>
        `
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.warn('Resend notification warning:', data);
    } else {
      console.log(`[Resend Notification] Sent email notification for: ${subscriberEmail}`);
    }
  } catch (err) {
    console.error('Failed to send Resend notification:', err);
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

  let savedSuccessfully = false;

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

      if (response.ok) {
        savedSuccessfully = true;
      } else {
        const text = await response.text();
        console.error('Supabase subscription error:', text);
      }
    } catch (err) {
      console.error('Supabase request failed:', err);
    }
  }

  // Fallback to local storage if Supabase is not yet configured or fails in local development
  if (!savedSuccessfully) {
    savedSuccessfully = saveSubscriberLocally(email);
  }

  if (savedSuccessfully) {
    // Send email alert via Resend asynchronously
    sendResendNotification(email).catch(console.error);

    return res.status(200).json({ 
      ok: true, 
      message: 'Subscribed successfully.' 
    });
  }

  return res.status(503).json({ error: 'Email collection service is not ready.' });
};
