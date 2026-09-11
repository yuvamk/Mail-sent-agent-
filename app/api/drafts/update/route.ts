import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { draftId, subject, body: draftBody } = body;

    if (!draftId) {
      return NextResponse.json({ error: 'draftId is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: updatedDraft, error } = await supabase
      .from('email_drafts')
      .update({
        subject,
        body: draftBody,
        status: 'reviewed',
        edited_by_user: true,
      })
      .eq('id', draftId)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, draft: updatedDraft });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update draft' }, { status: 500 });
  }
}
