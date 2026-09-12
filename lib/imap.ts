import { ImapFlow } from 'imapflow';
import { createAdminClient } from '@/lib/supabase-server';
import { getUserCredentials } from '@/lib/user-credentials';

export interface ReplySyncResult {
  success: boolean;
  repliesFound: number;
  newRepliesCount: number;
  details: Array<{
    leadId: string;
    company: string;
    email: string;
    subject: string;
    snippet: string;
    date: string;
  }>;
  message: string;
  requiresAuth?: boolean;
}

/**
 * Scan user email inbox via IMAP for replies from leads who received sent outreach.
 */
export async function syncEmailReplies(userId?: string | null): Promise<ReplySyncResult> {
  const supabase = createAdminClient();

  // 1. Get user credentials
  const creds = await getUserCredentials(userId);

  const imapHost = process.env.IMAP_HOST || 'imap.gmail.com';
  const imapPort = parseInt(process.env.IMAP_PORT || '993', 10);
  const imapUser = process.env.IMAP_USER || creds.smtpFromEmail || 'yuvamk6@gmail.com';
  const imapPass = process.env.IMAP_PASS || '';

  // 2. Fetch all leads that received sent outreach for this user
  let query = supabase
    .from('email_drafts')
    .select('id, lead_id, status, leads(id, company, email, raw_data)')
    .in('status', ['sent', 'replied']);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data: sentDrafts, error: draftsError } = await query;

  if (draftsError) {
    return {
      success: false,
      repliesFound: 0,
      newRepliesCount: 0,
      details: [],
      message: `Database query error: ${draftsError.message}`,
    };
  }

  if (!sentDrafts || sentDrafts.length === 0) {
    return {
      success: true,
      repliesFound: 0,
      newRepliesCount: 0,
      details: [],
      message: 'No sent outreach emails found in database to track.',
    };
  }

  // Map email addresses to drafts
  const emailToDraftMap = new Map<string, any>();
  for (const draft of sentDrafts) {
    const lead = draft.leads as any;
    if (lead?.email) {
      emailToDraftMap.set(lead.email.trim().toLowerCase(), {
        draftId: draft.id,
        leadId: lead.id,
        company: lead.company || 'Unknown Company',
        email: lead.email,
        status: draft.status,
        rawData: lead.raw_data || {},
      });
    }
  }

  if (emailToDraftMap.size === 0) {
    return {
      success: true,
      repliesFound: 0,
      newRepliesCount: 0,
      details: [],
      message: 'No valid recipient email addresses found among sent emails.',
    };
  }

  // 3. If no IMAP password configured, return clear instructions
  if (!imapPass) {
    return {
      success: false,
      requiresAuth: true,
      repliesFound: 0,
      newRepliesCount: 0,
      details: [],
      message:
        'IMAP password not configured. To automatically track email replies from Gmail, generate an App Password in your Google Account (Security > 2-Step Verification > App passwords) and add IMAP_PASS in Settings.',
    };
  }

  // 4. Connect to IMAP server and inspect inbox
  const client = new ImapFlow({
    host: imapHost,
    port: imapPort,
    secure: true,
    auth: {
      user: imapUser,
      pass: imapPass,
    },
    logger: false,
    emitLogs: false,
  });

  const matchedReplies: Array<{
    leadId: string;
    company: string;
    email: string;
    subject: string;
    snippet: string;
    date: string;
  }> = [];

  let newRepliesCount = 0;

  try {
    await client.connect();

    const lock = await client.getMailboxLock('INBOX', { readOnly: true });
    try {
      // Search recent messages from last 45 days
      const sinceDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);

      // Search all messages since date
      const messages = client.fetch(
        { since: sinceDate },
        {
          envelope: true,
          source: false,
          bodyParts: ['TEXT'],
        }
      );

      for await (const msg of messages) {
        const fromAddress = msg.envelope?.from?.[0]?.address?.trim().toLowerCase();
        if (!fromAddress) continue;

        // Check if fromAddress matches any of our sent lead emails
        const matched = emailToDraftMap.get(fromAddress);
        if (matched) {
          const subject = msg.envelope?.subject || 'Re: Job Application';
          const replyDate = msg.envelope?.date
            ? new Date(msg.envelope.date).toISOString()
            : new Date().toISOString();
          const snippet = `Reply from ${matched.company} (${fromAddress}): ${subject}`;

          matchedReplies.push({
            leadId: matched.leadId,
            company: matched.company,
            email: matched.email,
            subject,
            snippet,
            date: replyDate,
          });

          // If draft wasn't already marked as replied, update it
          if (matched.status !== 'replied') {
            newRepliesCount++;

            // 1. Update draft status
            await supabase
              .from('email_drafts')
              .update({ status: 'replied' })
              .eq('id', matched.draftId);

            // 2. Store reply info in lead's raw_data
            const updatedRawData = {
              ...matched.rawData,
              reply: {
                from: fromAddress,
                subject,
                snippet,
                received_at: replyDate,
              },
            };

            await supabase
              .from('leads')
              .update({ raw_data: updatedRawData })
              .eq('id', matched.leadId);
          }
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();

    return {
      success: true,
      repliesFound: matchedReplies.length,
      newRepliesCount,
      details: matchedReplies,
      message:
        matchedReplies.length > 0
          ? `Successfully tracked ${matchedReplies.length} reply email(s) from recruiters (${newRepliesCount} newly detected)!`
          : 'Inbox scanned: No new replies from contacted recruiters found yet.',
    };
  } catch (err: any) {
    console.error('IMAP Reply sync error:', err);
    return {
      success: false,
      repliesFound: 0,
      newRepliesCount: 0,
      details: [],
      message: `Failed to connect to IMAP (${imapHost}): ${err?.message || 'Check your Gmail App Password in Settings.'}`,
    };
  }
}
