// mailerService.js
/*
  FILE: mailerService.js
  LAYMAN (Tropang Ex): Ito yung iisang lugar na nagpapadala ng lahat ng email sa ChainCert —
    approval notifications, OTP codes, etc. Dati, bawat controller may sariling Ethereal test
    setup (fake inbox lang). Ngayon, lahat sila nag-iisa lang ng pila dito, at real Gmail na.
    May demo mode din: kung naka-set ang SMTP_OVERRIDE_TO sa .env, lahat ng email napupunta
    sa iisang inbox kahit sino pa yung tunay na recipient — para sa demo na may fake addresses.
  TECHNICAL: Singleton nodemailer transporter using Gmail SMTP service, initialised lazily on
    first sendMail() call so module-load ordering relative to dotenv.config() is never a concern.
    Reads SMTP_USER, SMTP_APP_PASSWORD, and SMTP_OVERRIDE_TO from process.env. SMTP_OVERRIDE_TO
    redirects all physical delivery to one catch-all address (demo/staging mode) while the call
    context still passes the intended recipient. Throws on failure — each caller owns its own
    error-handling shape (partial-success warning, silent swallow, or blocking 500).
  OUTLINE:
    TRANSPORT
      - getTransporter()      lazily creates and caches the Gmail SMTP transporter
      - isMailerConfigured()  returns true if SMTP_USER + SMTP_APP_PASSWORD are both present
    SEND
      - sendMail(opts)        sends one email; throws on SMTP / auth failure
*/

const nodemailer = require('nodemailer');

let _transporter = null;

/*
  Function Name: getTransporter

  LAYMAN (Tropang Ex):
  Gumagawa ng koneksyon sa Gmail SMTP — pero isang beses lang. Sa susunod na tawag, yung
  dating koneksyon na ang gagamitin (cached). Para hindi paulit-ulit na nagco-connect.

  TECHNICAL:
  Lazy-initialisation pattern. Reads env vars at call time (not at module load) so dotenv
  has already run by the time this is first invoked. Throws a descriptive error if
  SMTP_USER or SMTP_APP_PASSWORD are missing so the problem surfaces at send time, not
  silently at startup.

  PARAMS: (none)
  RETURNS: nodemailer Transporter instance (cached singleton).
*/
function getTransporter() {
  if (_transporter) return _transporter;

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error('[MAILER] Not configured: SMTP_USER and SMTP_APP_PASSWORD must be set in .env');
  }

  _transporter = nodemailer.createTransport({
    service: 'gmail',
    family: 4,            // E1: force IPv4 — WSL2 has no IPv6 route to Gmail SMTP (ENETUNREACH on AAAA)
    auth: { user, pass }
  });

  return _transporter;
}

/*
  Function Name: isMailerConfigured

  LAYMAN (Tropang Ex):
  Simple check lang — meron bang Gmail credentials sa .env? Useful para sa local dev kung
  gusto mong mag-skip ng email kung wala pang credentials na naka-set.

  TECHNICAL:
  Reads process.env at call time. Pure predicate, no side effects.

  PARAMS: (none)
  RETURNS: boolean — true if both SMTP_USER and SMTP_APP_PASSWORD are set.
*/
function isMailerConfigured() {
  return !!(process.env.SMTP_USER && process.env.SMTP_APP_PASSWORD);
}

/*
  Function Name: sendMail

  LAYMAN (Tropang Ex):
  Ito na yung actual na pagpapadala ng email. Lagyan mo ng "to" (sino matatanggap), "subject"
  (title ng email), at "html" o "text" (laman). Kung may SMTP_OVERRIDE_TO sa .env (demo mode),
  lahat ng email napupunta sa iisang inbox (e.g. chaincert.notify@gmail.com) kahit sino pa
  ang nakasulat sa "to" — para demo-able kahit puro fake email addresses ang ginagamit.
  PERO kung `realRecipient: true` (e.g. para sa mga HOLDER na totoo ang email), dumederetso
  ito sa tunay na recipient — hindi dumadaan sa central inbox. Ginagamit ito para sa credential
  emails ng holder; ang issuer/admin emails (peke ang address) ay nasa central pa rin.

  TECHNICAL:
  Calls getTransporter() for lazy init. Resolves physical delivery address: if `realRecipient`
  is true, ALWAYS delivers to the provided `to` (bypasses the demo catch-all — used for holder
  emails that are real addresses). Otherwise uses SMTP_OVERRIDE_TO if set (demo catchall), else
  `to`. Sets `from` to the authenticated SMTP_USER address to satisfy Gmail's sender-domain
  requirement — using a different from address would be silently overridden by Gmail anyway.
  Logs [MAILER] on success. Throws on any SMTP or auth failure; callers handle errors per policy.

  PARAMS:
  - to            — intended recipient email string.
  - subject       — email subject line string.
  - html          — HTML body string (optional; provide html OR text, not both).
  - text          — plain-text body string (optional; provide html OR text, not both).
  - realRecipient — boolean (optional, default false). True = bypass SMTP_OVERRIDE_TO and
                    deliver to `to` directly. Use for HOLDER emails (legit addresses);
                    leave false/unset for issuer/admin emails (test addresses → central inbox).

  RETURNS:
  nodemailer SentMessageInfo object on success. Throws Error on SMTP or auth failure.

  EXAMPLE
    await mailerService.sendMail({
      to: 'applicant@gmail.com',
      subject: 'Your ChainCert Issuer Application Has Been Approved',
      html: '<p>Dear <strong>Org Name</strong>, you are approved.</p>'
    });
    → SentMessageInfo { messageId: '<abc@gmail.com>', ... }
    → If SMTP_OVERRIDE_TO=chaincert.notify@gmail.com, physical delivery goes there instead.
*/
/*
  Function Name: renderEmail
  LAYMAN (Tropang Ex): Binabalot nito ang laman ng email sa isang magandang, branded na "shell" —
  may ChainCert header sa taas, malinis na puting container, at footer sa baba — para consistent
  at presentable lahat ng email natin (hindi na yung plain text na mukhang spam).
  TECHNICAL: Returns a full HTML document string with INLINE CSS (email clients strip <style> tags,
  so everything must be inline). Pass a `heading` and the inner `bodyHtml`; this wraps them in the
  ChainCert template. Light theme, mobile-friendly max-width.

  PARAMS:
  - heading  — the H1 line (optional).
  - bodyHtml — the inner HTML content (already-built string).
  - accent   — header bar color (optional, defaults to ChainCert purple).
  RETURNS: full HTML document string.
*/
function renderEmail({ heading, bodyHtml, accent = '#6d28d9' }) {
  return `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#eef0f4;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f4;">
      <tr><td align="center" style="padding:32px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 18px rgba(16,16,40,0.09);font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <!-- Accent header band -->
          <tr><td style="background:${accent};padding:20px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="font-size:21px;font-weight:700;color:#ffffff;letter-spacing:-0.2px;">Chain<span style="color:rgba(255,255,255,0.82);">Cert</span></td>
              <td align="right" style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:1px;">Verified Credentials</td>
            </tr></table>
          </td></tr>
          <!-- Body -->
          <tr><td style="padding:32px 32px 8px;">
            ${heading ? `<h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#16162a;line-height:1.35;">${heading}</h1>` : ''}
            ${bodyHtml}
          </td></tr>
          <!-- Footer -->
          <tr><td style="padding:20px 32px 26px;">
            <div style="border-top:1px solid #ececf2;padding-top:16px;color:#8a8a99;font-size:12px;line-height:1.6;">
              Automated message from <strong style="color:#6a6a7a;">ChainCert</strong> &mdash; a blockchain-backed credential platform. Please don&rsquo;t reply to this email.
            </div>
          </td></tr>
        </table>
        <div style="max-width:600px;margin:14px auto 0;color:#9a9aa8;font-size:11px;text-align:center;">&copy; ChainCert &middot; Secured on Hyperledger Fabric</div>
      </td></tr>
    </table>
  </body>
</html>`;
}

/*
  Function Name: renderButton
  LAYMAN (Tropang Ex): Gumagawa ng malinis na "button" (call-to-action) sa loob ng email —
  gaya ng "View Shared Profile". Table-based para gumana kahit sa Outlook.
  TECHNICAL: Email-client-safe CTA button (rounded table cell + anchor). Inline CSS only.
  PARAMS: href — link target; label — button text; accent — background color (default purple).
  RETURNS: HTML string (a <table> block) to drop into a renderEmail bodyHtml.
*/
function renderButton(href, label, accent = '#6d28d9') {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 10px;"><tr>
    <td align="center" style="border-radius:9px;background:${accent};">
      <a href="${href}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:9px;">${label}</a>
    </td></tr></table>`;
}

/*
  Function Name: renderOtpEmail
  LAYMAN (Tropang Ex): Espesyal na template para sa 6-digit codes (reset password, profile access) —
  malaki at madaling basahin ang code sa gitna.
  TECHNICAL: Convenience wrapper over renderEmail for one-time-code emails.

  PARAMS: { heading, intro, otp, note } — intro/note may contain inline HTML.
  RETURNS: full HTML document string.
*/
function renderOtpEmail({ heading, intro, otp, note }) {
  const bodyHtml = `
    <p style="margin:0 0 20px;color:#3a3a4c;font-size:15px;line-height:1.6;">${intro}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr>
      <td align="center" style="background:#f5f3ff;border:1px solid #e4dcff;border-radius:12px;padding:22px 24px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;color:#7a6aa8;text-transform:uppercase;margin:0 0 10px;">Your verification code</div>
        <div style="font-size:34px;font-weight:700;letter-spacing:10px;color:#16162a;font-family:'Courier New',monospace;">${otp}</div>
      </td>
    </tr></table>
    <p style="margin:0;color:#8a8a99;font-size:13px;line-height:1.6;">${note}</p>`;
  return renderEmail({ heading, bodyHtml });
}

// Single, ordinary email address. Deliberately strict: no commas, no semicolons, no angle
// brackets, no whitespace, no CR/LF. See the validation in sendMail for why each matters.
const SAFE_EMAIL_RE = /^[^\s<>,;:"\\()[\]]+@[^\s<>,;:"\\()[\]]+\.[A-Za-z]{2,}$/;

async function sendMail({ to, subject, html, text, realRecipient = false }) {
  const transporter = getTransporter();

  // realRecipient = true → deliver to the real address (HOLDER emails are legit).
  // Otherwise honor the demo catch-all (issuer/admin emails are test addresses).
  const deliverTo = realRecipient ? to : (process.env.SMTP_OVERRIDE_TO || to);

  /* Recipient validation.

     LAYMAN (Tropang Ex): Tinitingnan muna natin kung ISANG normal na email address talaga ang
     padadalhan. Dati, kung ano ang naipasa, yun ang dere-deretsong ibinibigay sa mail library.

     TECHNICAL: `to` is user-INFLUENCED on at least two paths — the profile-share recipient address
     (chosen by whoever creates the share link) and the signup/verifier OTP address (chosen by the
     requester). Two concrete problems with passing it through unchecked:

       1. A comma or semicolon turns one recipient into several, so a crafted address could fan a
          credential email or an OTP out to addresses the system never intended to contact.
       2. A CR/LF sneaks additional SMTP headers or commands into the message — the injection class
          behind the nodemailer advisory that prompted the 8.x -> 9.x upgrade in this same change.

     Rejecting anything that is not a single clean address closes both at the boundary, so the fix
     does not depend solely on the library version staying patched. */
  const target = String(deliverTo || '').trim();
  if (!SAFE_EMAIL_RE.test(target)) {
    throw new Error('Invalid recipient email address.');
  }

  const mailOptions = {
    from: `"ChainCert" <${process.env.SMTP_USER}>`,
    to: target,
    // Strip CR/LF from the subject too: it lands in a header, so a newline there is the same
    // header-injection primitive as in the recipient.
    subject: String(subject || '').replace(/[\r\n]+/g, ' ')
  };

  if (html) mailOptions.html = html;
  if (text) mailOptions.text = text;

  const info = await transporter.sendMail(mailOptions);
  console.log(`[MAILER] Sent to ${target}: ${mailOptions.subject}`);
  return info;
}

/*
  Function Name: sendMailFireAndForget

  LAYMAN (Tropang Ex):
  Pang-padala ng email sa BACKGROUND. Hindi hinihintay ng caller — babalik agad ang
  controller sa user, tapos tahimik na magpapadala ito. Kung pumalpak (e.g. walang
  internet o mali ang SMTP creds), naka-log lang (non-fatal) — hindi babagsak ang
  main action (issue, approve, revoke, etc.).

  TECHNICAL:
  Schedules sendMail() WITHOUT awaiting and swallows + logs any SMTP/auth error so it
  can never reject into the caller. Use for NOTIFICATION emails only — NOT for OTP
  flows, where the user is actively waiting for the code and a silent failure would
  leave them stuck. The Promise.resolve().then() wrapper also guards a synchronous
  throw from getTransporter() (e.g. missing SMTP_USER/SMTP_APP_PASSWORD).

  PARAMS:
  - opts  — same shape as sendMail ({ to, subject, html, text }).
  - label — log prefix for tracing (e.g. '[ISSUE]'). Optional, defaults to '[MAILER]'.

  RETURNS:
  (none) — fire-and-forget; resolves/rejects are handled internally.
*/
function sendMailFireAndForget(opts, label = '[MAILER]') {
  Promise.resolve()
    .then(() => sendMail(opts))
    .catch((err) => console.error(`${label} email failed (non-fatal):`, err?.message || err));
}

module.exports = { sendMail, sendMailFireAndForget, isMailerConfigured, renderEmail, renderOtpEmail, renderButton };
