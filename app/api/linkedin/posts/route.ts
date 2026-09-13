import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getUserIdFromRequest } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    const supabase = createAdminClient();

    let query = supabase
      .from('linkedin_posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (userId) {
      query = query.or(`user_id.eq.${userId},user_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      // Return empty array if table doesn't exist yet
      return NextResponse.json({ success: true, posts: [] });
    }

    return NextResponse.json({ success: true, posts: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, posts: [] });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, post_content, image_url, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Post ID is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const updateData: any = {};
    if (post_content !== undefined) updateData.post_content = post_content;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (status !== undefined) updateData.status = status;

    const { data, error } = await supabase
      .from('linkedin_posts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, post: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Post ID is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from('linkedin_posts').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Deleted' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
