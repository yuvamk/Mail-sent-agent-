import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getUserIdFromRequest } from '@/lib/supabase-server';
import { isUserAdmin } from '@/lib/subscription';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const adminUserId = await getUserIdFromRequest(req);
    if (!adminUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin authentication required' },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();

    // 1. Verify caller has admin privileges
    const { data: requesterData } = await supabase.auth.admin.getUserById(adminUserId);
    const requesterEmail = requesterData?.user?.email?.toLowerCase();

    let authorized = isUserAdmin(requesterEmail);
    if (!authorized) {
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('is_admin')
        .eq('user_id', adminUserId)
        .maybeSingle();

      if (userSettings?.is_admin) {
        authorized = true;
      }
    }

    if (!authorized) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access only' },
        { status: 403 }
      );
    }

    // 2. Parse target user
    const body = await req.json();
    const { targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: 'Target user ID is required' },
        { status: 400 }
      );
    }

    // 3. Prevent deleting self or superadmin
    const { data: targetData, error: targetError } = await supabase.auth.admin.getUserById(targetUserId);
    if (targetError || !targetData?.user) {
      return NextResponse.json(
        { success: false, error: 'User not found or already deleted' },
        { status: 404 }
      );
    }

    const targetEmail = targetData.user.email?.toLowerCase();
    if (isUserAdmin(targetEmail)) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete the platform superadmin account' },
        { status: 400 }
      );
    }

    if (targetUserId === adminUserId) {
      return NextResponse.json(
        { success: false, error: 'You cannot delete your own active administrator account' },
        { status: 400 }
      );
    }

    // 4. Cascade purge all tables for this user
    await Promise.allSettled([
      supabase.from('email_drafts').delete().eq('user_id', targetUserId),
      supabase.from('leads').delete().eq('user_id', targetUserId),
      supabase.from('resumes').delete().eq('user_id', targetUserId),
      supabase.from('linkedin_posts').delete().eq('user_id', targetUserId),
      supabase.from('linkedin_accounts').delete().eq('user_id', targetUserId),
      supabase.from('api_usage_logs').delete().eq('user_id', targetUserId),
      supabase.from('user_subscriptions').delete().eq('user_id', targetUserId),
      supabase.from('user_settings').delete().eq('user_id', targetUserId),
    ]);

    // 5. Permanently remove from Supabase Auth
    const { error: authDeleteErr } = await supabase.auth.admin.deleteUser(targetUserId);
    if (authDeleteErr) {
      console.error('Failed to delete auth user:', authDeleteErr);
      return NextResponse.json(
        { success: false, error: `Database records purged, but Auth delete returned: ${authDeleteErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `User ${targetEmail} and all associated data were permanently deleted.`,
    });
  } catch (error: any) {
    console.error('Admin user delete error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}
