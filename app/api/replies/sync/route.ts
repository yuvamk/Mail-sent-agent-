import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getUserIdFromRequest } from '@/lib/supabase-server';
import { syncEmailReplies } from '@/lib/imap';

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'sync';

    const supabase = createAdminClient();

    // 1. Manual Reply Recording
    if (action === 'record') {
      const { draftId, replyText, notes } = body;
      if (!draftId) {
        return NextResponse.json({ error: 'draftId is required' }, { status: 400 });
      }

      // Fetch draft and lead
      const { data: draft, error: draftError } = await supabase
        .from('email_drafts')
        .select('*, leads(*)')
        .eq('id', draftId)
        .single();

      if (draftError || !draft) {
        return NextResponse.json({ error: 'Draft record not found' }, { status: 404 });
      }

      // Update draft status to 'replied'
      await supabase
        .from('email_drafts')
        .update({ status: 'replied' })
        .eq('id', draftId);

      // Update lead raw_data with reply details
      const lead = draft.leads;
      if (lead) {
        const rawData = lead.raw_data || {};
        const updatedRawData = {
          ...rawData,
          reply: {
            from: lead.email || 'Recruiter',
            subject: `Re: ${draft.subject}`,
            snippet: replyText || notes || 'Recruiter replied',
            notes: notes || '',
            received_at: new Date().toISOString(),
            manual: true,
          },
        };

        await supabase
          .from('leads')
          .update({ raw_data: updatedRawData })
          .eq('id', lead.id);
      }

      return NextResponse.json({
        success: true,
        message: 'Recruiter reply recorded successfully!',
      });
    }

    // 2. Automatic IMAP Inbox Scan
    const syncResult = await syncEmailReplies(userId);
    return NextResponse.json(syncResult);
  } catch (error: any) {
    console.error('Replies sync endpoint error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to sync replies' },
      { status: 500 }
    );
  }
}
