import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getUserIdFromRequest } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);

    if (!userId) {
      // Unauthenticated guest sees zero leads
      return NextResponse.json({ leads: [] });
    }

    const supabase = createAdminClient();

    let { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*, email_drafts(id, status, ai_provider)')
      .eq('user_id', userId)
      .order('imported_at', { ascending: false });

    if (leadsError && leadsError.message?.includes('imported_at')) {
      const fallback = await supabase
        .from('leads')
        .select('*, email_drafts(id, status, ai_provider)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      leads = fallback.data;
      leadsError = fallback.error;
    }

    if (leadsError) {
      console.error('Database leads fetch error:', leadsError);
      return NextResponse.json({ error: leadsError.message }, { status: 500 });
    }

    let sentCount = 0;
    let repliedCount = 0;
    let draftedCount = 0;
    let failedCount = 0;

    const formatted = (leads || []).map((lead: any) => {
      const drafts = lead.email_drafts || [];
      // Pick most significant draft: replied > sent > reviewed > drafted > failed
      const repliedDraft = drafts.find((d: any) => d.status === 'replied');
      const sentDraft = drafts.find((d: any) => d.status === 'sent');
      const activeDraft = repliedDraft || sentDraft || drafts[0] || null;

      const status = activeDraft ? activeDraft.status : null;
      if (status === 'sent') sentCount++;
      else if (status === 'replied') repliedCount++;
      else if (status === 'drafted' || status === 'reviewed' || status === 'approved') draftedCount++;
      else if (status === 'failed') failedCount++;

      return {
        ...lead,
        created_at: lead.created_at || lead.imported_at,
        imported_at: lead.imported_at || lead.created_at,
        draftStatus: status,
      };
    });

    // Calculate total AI token cost in INR from api_usage_logs for current user
    let totalCostINR = 0;
    let totalTokens = 0;
    try {
      const { data: usageLogs } = await supabase
        .from('api_usage_logs')
        .select('total_tokens, estimated_cost_inr')
        .eq('user_id', userId);

      if (usageLogs) {
        for (const log of usageLogs) {
          totalTokens += log.total_tokens || 0;
          totalCostINR += parseFloat(log.estimated_cost_inr || '0');
        }
      }
    } catch (e) {
      console.warn('Could not query api_usage_logs for cost:', e);
    }

    const stats = {
      totalLeads: formatted.length,
      sentCount,
      repliedCount,
      draftedCount,
      failedCount,
      totalCostINR: Math.round(totalCostINR * 100) / 100,
      totalTokens,
    };

    return NextResponse.json({ leads: formatted, stats });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch leads' }, { status: 500 });
  }
}
