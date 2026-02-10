/**
 * Send the daily digest email via SendGrid.
 *
 * Required env vars (set as GitHub Secrets):
 *   SENDGRID_API_KEY   — SendGrid API key
 *   DIGEST_FROM_EMAIL  — verified sender address
 *   DIGEST_TO_EMAILS   — comma-separated recipient addresses
 */
import * as fs from 'fs';
import * as path from 'path';

interface SendEmailOpts {
  subject: string;
  htmlBody: string;
  pngPath: string;
}

export async function sendDigestEmail(opts: SendEmailOpts): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.DIGEST_FROM_EMAIL;
  const toEmails = process.env.DIGEST_TO_EMAILS;

  if (!apiKey || !fromEmail || !toEmails) {
    throw new Error(
      'Missing env vars: SENDGRID_API_KEY, DIGEST_FROM_EMAIL, DIGEST_TO_EMAILS'
    );
  }

  const recipients = toEmails.split(',').map((e) => e.trim()).filter(Boolean);
  if (recipients.length === 0) throw new Error('No recipients in DIGEST_TO_EMAILS');

  const pngBuffer = fs.readFileSync(opts.pngPath);
  const pngBase64 = pngBuffer.toString('base64');
  const filename = path.basename(opts.pngPath);

  const payload = {
    personalizations: recipients.map((email) => ({ to: [{ email }] })),
    from: { email: fromEmail, name: 'FarmIntel Digest' },
    subject: opts.subject,
    content: [
      {
        type: 'text/html',
        value: opts.htmlBody,
      },
    ],
    attachments: [
      {
        content: pngBase64,
        filename,
        type: 'image/png',
        disposition: 'attachment',
      },
    ],
  };

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SendGrid API error ${res.status}: ${body}`);
  }

  console.log(`Email sent to ${recipients.length} recipient(s)`);
}
