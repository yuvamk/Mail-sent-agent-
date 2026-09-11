import nodemailer from 'nodemailer';
import { getUserCredentials } from '@/lib/user-credentials';

export interface SendEmailPayload {
  toEmail: string;
  subject: string;
  bodyText: string;
  attachmentFileName?: string;
  attachmentBuffer?: Buffer;
  userId?: string | null;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  errorMessage?: string;
}

export async function sendOutreachEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
  const creds = await getUserCredentials(payload.userId);

  const host = creds.smtpHost;
  const port = creds.smtpPort;
  const user = creds.smtpUser;
  const pass = creds.smtpPass;

  if (!user || !pass) {
    return {
      success: false,
      errorMessage: 'SMTP credentials (username & password) are not configured in your Settings.',
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for 587
      auth: {
        user,
        pass,
      },
    });

    const attachments = [];
    if (payload.attachmentBuffer && payload.attachmentFileName) {
      attachments.push({
        filename: payload.attachmentFileName,
        content: payload.attachmentBuffer,
        contentType: 'application/pdf',
      });
    }

    const senderName = creds.candidateName || 'Yuvam Kumar';
    const fromAddress = creds.smtpFromEmail || 'yuvamk6@gmail.com';
    const formattedFrom = `"${senderName}" <${fromAddress}>`;

    const info = await transporter.sendMail({
      from: formattedFrom,
      replyTo: fromAddress,
      to: payload.toEmail,
      subject: payload.subject,
      text: payload.bodyText,
      // Convert line breaks to HTML for nice rendering in email clients
      html: payload.bodyText.replace(/\n/g, '<br/>'),
      attachments,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('SMTP Email sending error:', error);
    return {
      success: false,
      errorMessage: error?.message || 'Failed to send email via SMTP.',
    };
  }
}
