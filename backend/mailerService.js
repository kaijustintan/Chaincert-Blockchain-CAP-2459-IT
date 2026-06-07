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

  TECHNICAL:
  Calls getTransporter() for lazy init. Resolves physical delivery address: uses
  SMTP_OVERRIDE_TO if set (demo catchall), else the provided `to`. Sets `from` to the
  authenticated SMTP_USER address to satisfy Gmail's sender-domain requirement — using a
  different from address would be silently overridden by Gmail anyway. Logs [MAILER] on
  success. Throws on any SMTP or auth failure; callers handle errors per their own policy.

  PARAMS:
  - to      — intended recipient email string.
  - subject — email subject line string.
  - html    — HTML body string (optional; provide html OR text, not both).
  - text    — plain-text body string (optional; provide html OR text, not both).

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
async function sendMail({ to, subject, html, text }) {
  const transporter = getTransporter();

  const deliverTo = process.env.SMTP_OVERRIDE_TO || to;

  const mailOptions = {
    from: `"ChainCert" <${process.env.SMTP_USER}>`,
    to: deliverTo,
    subject
  };

  if (html) mailOptions.html = html;
  if (text) mailOptions.text = text;

  const info = await transporter.sendMail(mailOptions);
  console.log(`[MAILER] Sent to ${deliverTo}: ${subject}`);
  return info;
}

module.exports = { sendMail, isMailerConfigured };
