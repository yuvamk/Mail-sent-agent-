import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getUserIdFromRequest } from '@/lib/supabase-server';
import { publishToLinkedIn, getLinkedInProfile } from '@/lib/linkedin-publisher';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, post_content, image_url, topic, customAccessToken } = body;

    if (!post_content) {
      return NextResponse.json(
        { success: false, error: 'Post content is required to publish' },
        { status: 400 }
      );
    }

    const userId = await getUserIdFromRequest(req);
    const supabase = createAdminClient();

    // 1. Resolve LinkedIn Credentials
    let accessToken = customAccessToken || process.env.LINKEDIN_ACCESS_TOKEN || null;
    let personUrn: string | null = null;

    if (!accessToken && userId) {
      try {
        const { data: account } = await supabase
          .from('linkedin_accounts')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (account?.access_token) {
          accessToken = account.access_token;
          personUrn = account.linkedin_person_urn;
        }
      } catch {
        // ignore if table doesn't exist
      }
    }

    // 2. If no token, return clean requiresAuth response
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        requiresAuth: true,
        message: 'LinkedIn account not connected yet. Please connect your LinkedIn Access Token in Settings or the Connect modal to post directly.',
      });
    }

    // 3. Resolve Person URN if missing
    if (!personUrn) {
      try {
        const profile = await getLinkedInProfile(accessToken);
        personUrn = `urn:li:person:${profile.sub}`;
      } catch (profErr: any) {
        return NextResponse.json({
          success: false,
          error: `Failed to authenticate with LinkedIn: ${profErr.message}. Token might be expired.`,
        });
      }
    }

    // 4. Publish to LinkedIn API
    const result = await publishToLinkedIn(accessToken, personUrn, post_content, image_url, topic);

    if (!result.success) {
      if (id) {
        await supabase
          .from('linkedin_posts')
          .update({
            status: 'failed',
            error_message: result.error,
          })
          .eq('id', id);
      }
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    // 5. Update status in database
    if (id) {
      try {
        await supabase
          .from('linkedin_posts')
          .update({
            status: 'posted',
            linkedin_post_urn: result.postUrn,
            linkedin_post_url: result.postUrl,
            posted_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', id);
      } catch (dbErr) {
        console.warn('Could not update post record in DB:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      postUrn: result.postUrn,
      postUrl: result.postUrl,
    });
  } catch (err: any) {
    console.error('Error publishing to LinkedIn:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to publish to LinkedIn' },
      { status: 500 }
    );
  }
}
