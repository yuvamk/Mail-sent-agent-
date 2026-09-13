import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getUserIdFromRequest } from '@/lib/supabase-server';
import { isUserAdmin } from '@/lib/subscription';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const adminUserId = await getUserIdFromRequest(req);
    if (!adminUserId) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin authentication required' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Verify admin privilege
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
      return NextResponse.json({ success: false, error: 'Forbidden: Admin access only' }, { status: 403 });
    }

    const body = await req.json();
    const { targetUserId, action, days, newStatus, planId } = body;

    if (!targetUserId) {
      return NextResponse.json({ success: false, error: 'Missing targetUserId' }, { status: 400 });
    }

    const now = new Date();

    if (action === 'extend') {
      const extensionDays = Number(days || 30);
      // Fetch latest subscription
      const { data: existing } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const currentEnd = existing?.current_period_end ? new Date(existing.current_period_end) : now;
      const baseDate = currentEnd.getTime() > now.getTime() ? currentEnd : now;
      const newEnd = new Date(baseDate.getTime() + extensionDays * 86400000);

      const { data: updated, error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: targetUserId,
          plan_id: existing?.plan_id || 'pro_monthly',
          plan_name: existing?.plan_name || 'Pro Career Monthly',
          status: 'active',
          amount: existing?.amount || 499,
          currency: 'INR',
          current_period_start: now.toISOString(),
          current_period_end: newEnd.toISOString(),
          invoice_number: `INV-ADMIN-EXT-${Date.now().toString().slice(-4)}`,
        })
        .select()
        .maybeSingle();

      if (error) throw error;
      return NextResponse.json({ success: true, message: `Extended by +${extensionDays} days`, subscription: updated });
    } else if (action === 'set_status') {
      const statusToSet = newStatus || 'active';
      const isExpiring = statusToSet === 'expired';
      const newEnd = isExpiring
        ? new Date(now.getTime() - 86400000).toISOString()
        : new Date(now.getTime() + 30 * 86400000).toISOString();

      const { data: updated, error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: targetUserId,
          plan_id: planId || 'pro_monthly',
          plan_name: planId === 'enterprise' ? 'Enterprise Agency' : 'Pro Career Monthly',
          status: statusToSet,
          amount: 499,
          currency: 'INR',
          current_period_start: now.toISOString(),
          current_period_end: newEnd,
          invoice_number: `INV-ADMIN-STATUS-${Date.now().toString().slice(-4)}`,
        })
        .select()
        .maybeSingle();

      if (error) throw error;
      return NextResponse.json({ success: true, message: `Status updated to ${statusToSet}`, subscription: updated });
    } else if (action === 'grant_vip') {
      const newEnd = new Date(now.getTime() + 365 * 86400000).toISOString();

      const { data: updated, error } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: targetUserId,
          plan_id: 'enterprise',
          plan_name: 'Admin VIP Unlimited',
          status: 'active',
          amount: 0,
          currency: 'INR',
          current_period_start: now.toISOString(),
          current_period_end: newEnd,
          invoice_number: `INV-ADMIN-VIP-${Date.now().toString().slice(-4)}`,
        })
        .select()
        .maybeSingle();

      if (error) throw error;
      return NextResponse.json({ success: true, message: 'VIP 1-Year Access Granted!', subscription: updated });
    }

    return NextResponse.json({ success: false, error: 'Unknown admin subscription action' }, { status: 400 });
  } catch (error: any) {
    console.error('[admin/subscription error]:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Admin action failed' }, { status: 500 });
  }
}
