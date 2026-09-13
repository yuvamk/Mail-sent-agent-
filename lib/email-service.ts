/**
 * Centralized Platform Email Dispatch Service
 * Strictly uses the user's authenticated Brevo SMTP relay from environment variables.
 */

export interface PlatformEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  fromName?: string;
  replyTo?: string;
}

export async function sendPlatformEmail({
  to,
  subject,
  html,
  text,
  fromName = 'ReachOut AI',
  replyTo,
}: PlatformEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const nodemailer = (await import('nodemailer')).default;

    const host = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';
    const fromEmail = process.env.SMTP_FROM_EMAIL || 'yuvamk6@gmail.com';

    if (!user || !pass) {
      console.warn('[Platform Email Warning]: Missing SMTP credentials in environment.');
      return {
        success: false,
        error: 'SMTP relay credentials not configured in environment variables (SMTP_USER / SMTP_PASS).',
      };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    const formattedFrom = `"${fromName}" <${fromEmail}>`;
    const recipients = Array.isArray(to) ? to.join(', ') : to;

    const info = await transporter.sendMail({
      from: formattedFrom,
      to: recipients,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      replyTo: replyTo || fromEmail,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('[sendPlatformEmail Error]:', error);
    return {
      success: false,
      error: error?.message || 'Failed to dispatch platform email via SMTP relay',
    };
  }
}
