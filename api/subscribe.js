const fs = require('fs');
const path = require('path');
const { configured, supabase } = require('./_lib/supabase');

// Local file save fallback (works on local machine; safely skips on read-only serverless lambdas).
// Returns 'new', 'existing', or null when the file cannot be written.
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
    return existing ? 'existing' : 'new';
  } catch (err) {
    // Expected on read-only serverless environments like Vercel
    return null;
  }
}

// Send instant email notification to admin via Resend API
function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

async function sendResendAdminAlert(subscriberEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const toEmail = process.env.NOTIFICATION_EMAIL || 'innswara@gmail.com';
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
              <p style="margin: 6px 0 0; font-size: 18px; color: #00A3FF; font-weight: bold;">${escapeHtml(subscriberEmail)}</p>
            </div>
            <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">Time (UTC): ${new Date().toUTCString()}</p>
          </div>
        `
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.warn('[Resend Admin Alert Warning]:', data);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Resend Admin Alert Error]:', err);
    return false;
  }
}

// Send automated welcome email to the subscriber
async function sendResendWelcomeEmail(subscriberEmail) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'INNIE Group <onboarding@resend.dev>';

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [subscriberEmail],
        subject: "Welcome to INNIE Group — you're on the list",
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <h2 style="color: #00A3FF; margin-top: 0; font-size: 24px; letter-spacing: 0.04em;">INNIE GROUP</h2>
            <p style="font-size: 16px; color: #0f172a; line-height: 1.6;">Thank you for joining our waitlist! You're officially in line to receive private beta invites, launch-day access, and development updates.</p>
            <p style="font-size: 15px; color: #475569; line-height: 1.6;">In the meantime, follow our journey and behind-the-scenes updates on X:</p>
            <div style="margin: 24px 0;">
              <a href="https://x.com/inniegroup" style="display: inline-block; background-color: #00A3FF; color: #ffffff; padding: 12px 24px; border-radius: 6px; font-weight: 600; text-decoration: none; font-size: 14px;">Follow @inniegroup on X &rarr;</a>
            </div>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 28px 0 16px;" />
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">INNIE Group &middot; Building simple, useful products and services that move people forward.</p>
          </div>
        `
      })
    });
  } catch (err) {
    // Non-fatal
  }
}

// Saves the address. Returns 'new', 'existing', or null when Supabase is not
// configured or the save failed.
async function saveSubscriberToSupabase(email) {
  const response = await supabase('innie_subscribers?on_conflict=email', {
    method: 'POST',
    // ignore-duplicates + representation returns only rows that were actually inserted.
    headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify({ email })
  });
  if (!response) return null;
  if (!response.ok) {
    console.error('[Supabase Error]:', await response.text());
    return null;
  }
  const rows = await response.json().catch(() => []);
  return Array.isArray(rows) && rows.length > 0 ? 'new' : 'existing';
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const email = String(req.body?.email || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@<>"'&]+@[^\s@<>"'&]+\.[^\s@<>"'&]+$/.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }

  // 1. Store the address. Supabase tells us whether it is new; the local file is for development.
  const saved = (await saveSubscriberToSupabase(email)) || saveSubscriberLocally(email);

  // 2. Emails go out only for a first-time signup, so the form cannot be used to
  //    send repeated mail to someone else's inbox. When the address could not be
  //    stored anywhere, the admin alert is the only record, so it is still sent.
  let alertSent = false;
  if (process.env.RESEND_API_KEY) {
    if (saved === 'new' || !saved) {
      alertSent = await sendResendAdminAlert(email);
    }
    // The welcome email needs Supabase to prove the address is new.
    if (saved === 'new' && configured()) {
      await sendResendWelcomeEmail(email);
    }
  }

  if (saved || alertSent) {
    // Same reply for new and existing addresses, so the form does not reveal who has signed up.
    return res.status(200).json({ ok: true, message: 'Subscribed successfully.' });
  }

  console.error('[Subscribe] Nothing stored: set SUPABASE_SERVICE_ROLE_KEY and/or RESEND_API_KEY in Vercel.');
  return res.status(503).json({
    error: 'Sorry, sign-ups are paused for a moment. Please try again later or email inniegroup@gmail.com.'
  });
};
