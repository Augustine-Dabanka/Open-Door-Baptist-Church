// Vercel serverless function — handles contact + newsletter signups via Resend.
//
// Required env var (add in Vercel → Settings → Environment Variables):
//   RESEND_API_KEY   — your Resend API key (https://resend.com/api-keys)
// Optional env vars:
//   ODBC_NOTIFY_EMAIL — where submissions are emailed (default opendoorbaptistch@gmail.com)
//   ODBC_FROM_EMAIL   — verified Resend sender (default onboarding@resend.dev until a
//                       domain is verified in Resend; then use e.g. noreply@yourdomain)
//
// Until RESEND_API_KEY is set the endpoint still accepts submissions (logged in Vercel),
// so visitors are never shown an error — emails simply start flowing once the key is added.

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ errors: [{ message: 'Method not allowed.' }] });
        return;
    }

    // Vercel parses application/x-www-form-urlencoded and application/json into req.body
    let body = req.body || {};
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (_) { body = {}; } }

    const clean = (s, max = 500) =>
        (typeof s === 'string' ? s.replace(/[\x00-\x1F\x7F]/g, '').replace(/\s+/g, ' ').trim().slice(0, max) : '');

    // Honeypot: bots fill this — accept silently and drop.
    if (clean(body._gotcha)) { res.status(200).json({ ok: true }); return; }

    const email = clean(body.email, 150);
    const phone = clean(body.phone, 30);
    const name = clean(body.name, 100);
    const reason = clean(body.reason, 60);
    const message = clean(body.message, 2000);
    const subject = clean(body._subject, 120) || 'New submission — ODBC Website';

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRe.test(email)) {
        res.status(422).json({ errors: [{ message: 'A valid email address is required.' }] });
        return;
    }

    const summary = [
        name && `Name: ${name}`,
        `Email: ${email}`,
        phone && `Phone: ${phone}`,
        reason && `Reason: ${reason}`,
        message && `Message:\n${message}`
    ].filter(Boolean).join('\n');

    const KEY = process.env.RESEND_API_KEY;
    const TO = process.env.ODBC_NOTIFY_EMAIL || 'opendoorbaptistch@gmail.com';
    const FROM = process.env.ODBC_FROM_EMAIL || 'onboarding@resend.dev';

    // Not configured yet — accept gracefully; the admin adds RESEND_API_KEY later.
    if (!KEY) {
        console.log('[subscribe] RESEND_API_KEY not set — submission received:', summary.replace(/\n/g, ' | '));
        res.status(200).json({ ok: true, note: 'received' });
        return;
    }

    try {
        const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from: `Open Door Baptist Church <${FROM}>`,
                to: [TO],
                reply_to: email,
                subject,
                text: summary
            })
        });
        if (!r.ok) {
            const detail = await r.text().catch(() => '');
            console.error('[subscribe] Resend error', r.status, detail);
            res.status(502).json({ errors: [{ message: 'Could not send right now. Please try again later.' }] });
            return;
        }
        res.status(200).json({ ok: true });
    } catch (err) {
        console.error('[subscribe]', err);
        res.status(500).json({ errors: [{ message: 'Server error. Please try again later.' }] });
    }
};
