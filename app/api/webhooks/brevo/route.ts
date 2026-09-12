import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

/**
 * Brevo Transactional Webhook Handler
 * Receives real-time push events from Brevo when an email is:
 * - delivered
 * - opened
 * - hard_bounce
 * - soft_bounce
 * - blocked
 * - click
 */
export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => null);

    if (!payload || !payload.email) {
      return NextResponse.json({ message: 'No valid payload or email received' }, { status: 400 });
    }

    const eventName = (payload.event || '').toLowerCase();
    const recipientEmail = (payload.email || '').toLowerCase().trim();
    const reason = payload.reason || payload.error || `Brevo event: ${eventName}`;
    const eventDate = payload.date || new Date().toISOString();

    const supabase = createAdminClient();

    // Look up matching drafts by recipient email (via leads)
    const { data: drafts } = await supabase
      .from('email_drafts')
      .select('id, lead_id, status, error_message, leads(id, email, raw_data)')
      .in('status', ['sent', 'delivered', 'opened', 'bounced', 'failed', 'replied']);

    if (drafts && drafts.length > 0) {
      const matchedDraft = drafts.find(
        (d) => (d.leads as any)?.email?.toLowerCase()?.trim() === recipientEmail
      );

      if (matchedDraft && matchedDraft.status !== 'replied') {
        const lead = matchedDraft.leads as any;
        const currentRawData = lead?.raw_data || {};

        if (eventName === 'opened' || eventName === 'unique_opened') {
          await supabase
            .from('email_drafts')
            .update({ status: 'opened', error_message: null })
            .eq('id', matchedDraft.id);

          if (lead?.id) {
            await supabase.from('leads').update({
              raw_data: {
                ...currentRawData,
                brevo_status: 'opened',
                opened_at: eventDate,
                last_webhook_event: payload,
              },
            }).eq('id', lead.id);
          }
        } else if (
          eventName === 'hard_bounce' ||
          eventName === 'soft_bounce' ||
          eventName === 'blocked' ||
          eventName === 'invalid_email'
        ) {
          await supabase
            .from('email_drafts')
            .update({ status: 'bounced', error_message: reason })
            .eq('id', matchedDraft.id);

          if (lead?.id) {
            await supabase.from('leads').update({
              raw_data: {
                ...currentRawData,
                brevo_status: 'bounced',
                bounce_reason: reason,
                bounced_at: eventDate,
                last_webhook_event: payload,
              },
            }).eq('id', lead.id);
          }
        } else if (eventName === 'delivered' && matchedDraft.status === 'sent') {
          await supabase
            .from('email_drafts')
            .update({ status: 'delivered', error_message: null })
            .eq('id', matchedDraft.id);

          if (lead?.id) {
            await supabase.from('leads').update({
              raw_data: {
                ...currentRawData,
                brevo_status: 'delivered',
                delivered_at: eventDate,
                last_webhook_event: payload,
              },
            }).eq('id', lead.id);
          }
        }
      }
    }

    return NextResponse.json({ success: true, processedEmail: recipientEmail, event: eventName });
  } catch (error: any) {
    console.error('Brevo webhook error:', error);
    return NextResponse.json({ error: error?.message || 'Webhook processing failed' }, { status: 500 });
  }
}
