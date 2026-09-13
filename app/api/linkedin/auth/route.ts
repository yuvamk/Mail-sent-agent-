import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getUserIdFromRequest } from '@/lib/supabase-server';
import { getLinkedInProfile } from '@/lib/linkedin-publisher';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    const envToken = process.env.LINKEDIN_ACCESS_TOKEN;

    if (envToken) {
      let name = 'Yuvam Kumar';
      try {
        const prof = await getLinkedInProfile(envToken);
        if (prof?.name) name = prof.name;
      } catch {
        // fallback
      }
      return NextResponse.json({
        isConnected: true,
        source: 'env',
        profileName: name,
      });
    }

    if (!userId) {
      return NextResponse.json({ isConnected: false });
    }

    const supabase = createAdminClient();
    const { data: account } = await supabase
      .from('linkedin_accounts')
      .select('profile_name, profile_picture_url, is_connected, updated_at')
      .eq('user_id', userId)
      .single();

    if (account && account.is_connected) {
      return NextResponse.json({
        isConnected: true,
        profileName: account.profile_name,
        profilePicture: account.profile_picture_url,
      });
    }

    return NextResponse.json({ isConnected: false });
  } catch (err: any) {
    return NextResponse.json({ isConnected: false });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accessToken } = body;

    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Access token is required' }, { status: 400 });
    }

    // 1. Verify token with LinkedIn
    let profile: any;
    try {
      profile = await getLinkedInProfile(accessToken);
    } catch (verErr: any) {
      return NextResponse.json({
        success: false,
        error: `Invalid LinkedIn token: ${verErr.message}`,
      }, { status: 400 });
    }

    const userId = await getUserIdFromRequest(req);
    const supabase = createAdminClient();

    const accountData = {
      user_id: userId || '00000000-0000-0000-0000-000000000000',
      linkedin_person_urn: `urn:li:person:${profile.sub}`,
      access_token: accessToken,
      profile_name: profile.name,
      profile_picture_url: profile.picture || null,
      is_connected: true,
      updated_at: new Date().toISOString(),
    };

    try {
      await supabase
        .from('linkedin_accounts')
        .upsert(accountData, { onConflict: 'user_id' });
    } catch (dbErr) {
      console.warn('Could not save to linkedin_accounts table:', dbErr);
    }

    return NextResponse.json({
      success: true,
      profile: {
        name: profile.name,
        picture: profile.picture,
        urn: `urn:li:person:${profile.sub}`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
