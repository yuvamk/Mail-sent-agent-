import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getUserIdFromRequest } from '@/lib/supabase-server';
import { getLinkedInProfile } from '@/lib/linkedin-publisher';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);

    if (!userId) {
      return NextResponse.json({ isConnected: false, requiresLogin: true });
    }

    const supabase = createAdminClient();

    // 1. Check user's personal linkedin_accounts record
    try {
      const { data: account } = await supabase
        .from('linkedin_accounts')
        .select('profile_name, profile_picture_url, is_connected, updated_at, linkedin_person_urn')
        .eq('user_id', userId)
        .maybeSingle();

      if (account && account.is_connected) {
        return NextResponse.json({
          isConnected: true,
          profileName: account.profile_name || 'LinkedIn User',
          profilePicture: account.profile_picture_url || null,
          personUrn: account.linkedin_person_urn || null,
          source: 'db',
        });
      }
    } catch {
      // ignore table query error
    }

    // 2. Check user's settings table for custom token
    try {
      const { data: settings } = await supabase
        .from('user_settings')
        .select('linkedin_access_token, linkedin_person_urn')
        .eq('user_id', userId)
        .maybeSingle();

      if (settings?.linkedin_access_token) {
        try {
          const prof = await getLinkedInProfile(settings.linkedin_access_token);
          return NextResponse.json({
            isConnected: true,
            profileName: prof?.name || 'LinkedIn User',
            profilePicture: prof?.picture || null,
            personUrn: settings.linkedin_person_urn || `urn:li:person:${prof?.sub}`,
            source: 'settings',
          });
        } catch {
          // token might be expired
        }
      }
    } catch {
      // ignore
    }

    // 3. ONLY for platform admin (yuvamk6@gmail.com), allow server env token as default fallback
    try {
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      const email = userData?.user?.email?.toLowerCase();
      const adminEmails = (process.env.ADMIN_EMAILS || 'yuvamk6@gmail.com')
        .split(',')
        .map((e) => e.trim().toLowerCase());

      if (email && adminEmails.includes(email)) {
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
            source: 'env-admin',
            profileName: name,
            personUrn: process.env.LINKEDIN_PERSON_URN || null,
          });
        }
      }
    } catch {
      // ignore
    }

    // Standard user without a connected token
    return NextResponse.json({ isConnected: false });
  } catch (err: any) {
    return NextResponse.json({ isConnected: false, error: err.message });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = await getUserIdFromRequest(req, body.userId);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Please sign in to connect LinkedIn.' },
        { status: 401 }
      );
    }

    const { accessToken } = body;

    if (!accessToken?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Valid LinkedIn access token is required' },
        { status: 400 }
      );
    }

    // 1. Verify token with LinkedIn
    let profile: any;
    try {
      profile = await getLinkedInProfile(accessToken.trim());
    } catch (verErr: any) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid LinkedIn token: ${verErr.message}`,
        },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const accountData = {
      user_id: userId,
      linkedin_person_urn: `urn:li:person:${profile.sub}`,
      access_token: accessToken.trim(),
      profile_name: profile.name || 'LinkedIn User',
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

    // Also persist in user_settings for convenience
    try {
      await supabase.from('user_settings').upsert({
        user_id: userId,
        linkedin_access_token: accessToken.trim(),
        linkedin_person_urn: `urn:li:person:${profile.sub}`,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    } catch {
      // ignore
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

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    await supabase.from('linkedin_accounts').delete().eq('user_id', userId);
    await supabase.from('user_settings').update({
      linkedin_access_token: null,
      linkedin_person_urn: null,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId);

    return NextResponse.json({ success: true, message: 'LinkedIn account disconnected' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
