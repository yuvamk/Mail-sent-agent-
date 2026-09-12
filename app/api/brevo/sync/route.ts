import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/supabase-server';
import { syncBrevoDeliveryStatus } from '@/lib/brevo';

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const targetUserId = body.userId || userId;

    const result = await syncBrevoDeliveryStatus(targetUserId);

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    console.error('Brevo sync error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to sync Brevo status' },
      { status: 500 }
    );
  }
}
