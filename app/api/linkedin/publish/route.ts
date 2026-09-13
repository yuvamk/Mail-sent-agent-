import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getUserIdFromRequest } from '@/lib/supabase-server';
import { publishToLinkedIn, getLinkedInProfile } from '@/lib/linkedin-publisher';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = await getUserIdFromRequest(req, body.userId);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please sign in to publish to LinkedIn.' },
        { status: 401 }
      );
    }

    const { id, post_content, image_url, topic, customAccessToken } = body;

    if (!post_content) {
      return NextResponse.json(
        { success: false, error: 'Post content is required to publish' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Resolve LinkedIn Credentials specifically for THIS user
    let accessToken = customAccessToken?.trim() || null;
    let personUrn: string | null = null;

    if (!accessToken) {
      // Check user's personal linkedin_accounts table
      try {
        const { data: account } = await supabase
          .from('linkedin_accounts')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (account?.access_token) {
          accessToken = account.access_token;
          personUrn = account.linkedin_person_urn;
        }
      } catch {
        // ignore
      }
    }

    if (!accessToken) {
      // Check user's personal user_settings table
      try {
        const { data: settings } = await supabase
          .from('user_settings')
          .select('linkedin_access_token, linkedin_person_urn')
          .eq('user_id', userId)
          .maybeSingle();

        if (settings?.linkedin_access_token) {
          accessToken = settings.linkedin_access_token;
          personUrn = settings.linkedin_person_urn;
        }
      } catch {
        // ignore
      }
    }

    // Platform admin fallback only
    if (!accessToken) {
      try {
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        const email = userData?.user?.email?.toLowerCase();
        const adminEmails = (process.env.ADMIN_EMAILS || 'yuvamk6@gmail.com')
          .split(',')
          .map((e) => e.trim().toLowerCase());

        if (email && adminEmails.includes(email) && process.env.LINKEDIN_ACCESS_TOKEN) {
          accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
          personUrn = process.env.LINKEDIN_PERSON_URN || null;
        }
      } catch {
        // ignore
      }
    }

    // 2. If no token found, return requiresAuth
    if (!accessToken) {
      return NextResponse.json({
        success: false,
        requiresAuth: true,
        message: 'Your LinkedIn account is not connected yet. Please click "Connect LinkedIn" and paste your LinkedIn OAuth Access Token to publish to your personal feed.',
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
        }, { status: 401 });
      }
    }

    // 4. Publish to LinkedIn REST API (v202608)
    const publishResult = await publishToLinkedIn(
      accessToken,
      personUrn,
      post_content,
      image_url,
      topic || 'Tech Insights'
    );

    if (!publishResult.success) {
      return NextResponse.json({
        success: false,
        error: publishResult.error || 'Failed to publish to LinkedIn',
      }, { status: 500 });
    }

    // 5. Update Post Record in DB
    if (id) {
      try {
        await supabase
          .from('linkedin_posts')
          .update({
            status: 'posted',
            linkedin_post_urn: publishResult.postUrn,
            linkedin_post_url: publishResult.postUrl,
            posted_at: new Date().toISOString(),
            error_message: null,
          })
          .eq('id', id)
          .eq('user_id', userId);
      } catch (dbErr) {
        console.warn('Could not update post status in DB:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      postUrn: publishResult.postUrn,
      postUrl: publishResult.postUrl,
      message: 'Successfully published to your personal LinkedIn feed!',
    });
  } catch (err: any) {
    console.error('LinkedIn publishing route error:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to publish to LinkedIn',
      },
      { status: 500 }
    );
  }
}
