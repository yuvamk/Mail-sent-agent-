/**
 * Centralized Platform Email Dispatch Service
 * Strictly uses the user's authenticated Brevo SMTP relay and Brevo API from environment variables.
 * NEVER uses Supabase email/OTP service.
 */

export interface PlatformEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  replyTo?: string;
}

let cachedTransporter: any = null;

async function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const nodemailer = (await import('nodemailer')).default;
  const host = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  if (!user || !pass) {
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 8000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
    auth: {
      user,
      pass,
    },
  });

  return cachedTransporter;
}

/**
 * Direct Brevo REST API fallback (Port 443 HTTPS)
 * Used as high-reliability failover if SMTP socket is blocked or throttled by cloud hosting.
 */
async function sendViaBrevoRestApi(
  options: PlatformEmailOptions,
  fromEmail: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const brevoApiKey = process.env.BREVO_API_KEY || '';
  if (!brevoApiKey || !brevoApiKey.startsWith('xkeysib-')) {
    return { success: false, error: 'BREVO_API_KEY not configured for REST fallback' };
  }

  try {
    const toList = Array.isArray(options.to)
      ? options.to.map((email) => ({ email: email.trim() }))
      : [{ email: options.to.trim() }];

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: options.fromName || 'ReachOut AI',
          email: fromEmail,
        },
        to: toList,
        subject: options.subject,
        htmlContent: options.html,
        textContent: options.text || options.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        replyTo: options.replyTo ? { email: options.replyTo } : undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data?.message || `Brevo REST API error ${res.status}` };
    }

    return {
      success: true,
      messageId: data.messageId || 'brevo-api-sent',
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Brevo REST API fetch failed' };
  }
}

export async function sendPlatformEmail({
  to,
  subject,
  html,
  text,
  fromName = 'ReachOut AI',
  replyTo,
}: PlatformEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const fromEmail = process.env.SMTP_FROM_EMAIL || 'yuvamk6@gmail.com';
  const recipients = Array.isArray(to) ? to.join(', ') : to;
  const formattedFrom = `"${fromName}" <${fromEmail}>`;

  // 1. Primary Attempt: Fast Brevo SMTP Relay (Nodemailer Pool)
  try {
    const transporter = await getTransporter();
    if (transporter) {
      const info = await transporter.sendMail({
        from: formattedFrom,
        to: recipients,
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        replyTo: replyTo || fromEmail,
      });

      console.log(`[SMTP Dispatch Success]: MessageId: ${info.messageId} to ${recipients}`);
      return {
        success: true,
        messageId: info.messageId,
      };
    }
  } catch (smtpError: any) {
    console.warn('[SMTP Dispatch Failed - Attempting Brevo REST API Fallback]:', smtpError.message);
  }

  // 2. Secondary Fast Fallback: Brevo REST API (HTTPS port 443)
  const restResult = await sendViaBrevoRestApi(
    { to, subject, html, text, fromName, replyTo },
    fromEmail
  );

  if (restResult.success) {
    console.log(`[Brevo REST Dispatch Success]: to ${recipients}`);
    return restResult;
  }

  console.error('[All Email Dispatch Methods Failed]:', restResult.error);
  return {
    success: false,
    error: restResult.error || 'Failed to dispatch email via SMTP relay and Brevo API.',
  };
}
