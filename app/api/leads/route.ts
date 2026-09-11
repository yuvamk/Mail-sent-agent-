import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*, email_drafts(id, status, ai_provider)')
      .order('imported_at', { ascending: false });

    if (leadsError) {
      return NextResponse.json({ error: leadsError.message }, { status: 500 });
    }

    const formatted = (leads || []).map((lead: any) => {
      const draft = lead.email_drafts && lead.email_drafts.length > 0 ? lead.email_drafts[0] : null;
      return {
        ...lead,
        draftStatus: draft ? draft.status : null,
      };
    });

    return NextResponse.json({ leads: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch leads' }, { status: 500 });
  }
}
