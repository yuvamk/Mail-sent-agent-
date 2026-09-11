import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: drafts, error } = await supabase
      .from('email_drafts')
      .select('*, leads(*), resumes(*)')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ drafts: drafts || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch drafts' }, { status: 500 });
  }
}
