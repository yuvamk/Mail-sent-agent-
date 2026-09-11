import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getUserIdFromRequest } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ drafts: [] });
    }

    const supabase = createAdminClient();

    const { data: drafts, error } = await supabase
      .from('email_drafts')
      .select('*, leads(*), resumes(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ drafts: drafts || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch drafts' }, { status: 500 });
  }
}
