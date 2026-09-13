import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/supabase-server';
import { getSubscriptionStatus } from '@/lib/subscription';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const status = await getSubscriptionStatus(userId);
    return NextResponse.json({ success: true, subscription: status });
  } catch (error: any) {
    console.error('[payment/status error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to retrieve subscription status' },
      { status: 500 }
    );
  }
}
