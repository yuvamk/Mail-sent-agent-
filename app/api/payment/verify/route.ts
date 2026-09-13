import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient, getUserIdFromRequest } from '@/lib/supabase-server';
import {
  SUBSCRIPTION_PLANS,
  sendSubscriptionInvoiceEmail,
  sendAdminPaymentAlert,
} from '@/lib/subscription';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, paymentId, signature, planId } = body;

    const plan = SUBSCRIPTION_PLANS[planId] || SUBSCRIPTION_PLANS.pro_monthly;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    // Verify Razorpay HMAC signature if secret is configured and not a demo order
    if (razorpayKeySecret && signature && !orderId?.startsWith('order_demo_')) {
      const generatedSignature = crypto
        .createHmac('sha256', razorpayKeySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      if (generatedSignature !== signature) {
        return NextResponse.json(
          { success: false, error: 'Invalid payment signature. Verification failed.' },
          { status: 400 }
        );
      }
    }

    const supabase = createAdminClient();
    const now = new Date();
    const periodEnd = new Date(now.getTime() + plan.periodDays * 24 * 60 * 60 * 1000);
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const effectivePaymentId = paymentId || `pay_sim_${Date.now()}`;
    const effectiveOrderId = orderId || `order_sim_${Date.now()}`;

    // 1. Insert/Update user_subscriptions
    const { data: subData, error: subError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        plan_id: plan.id,
        plan_name: plan.name,
        status: 'active',
        amount: plan.amount,
        currency: 'INR',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        razorpay_order_id: effectiveOrderId,
        razorpay_payment_id: effectivePaymentId,
        razorpay_signature: signature || 'verified_checkout',
        invoice_number: invoiceNumber,
      })
      .select()
      .maybeSingle();

    if (subError) {
      console.error('[Verify payment DB insert error]:', subError);
    }

    // 2. Fetch user's email to send invoice and admin alert
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const userEmail = userData?.user?.email;

    if (userEmail) {
      // Async trigger user invoice and admin notification email without blocking response
      Promise.allSettled([
        sendSubscriptionInvoiceEmail(userEmail, {
          invoiceNumber,
          planName: plan.name,
          amount: plan.amount,
          paymentId: effectivePaymentId,
          orderId: effectiveOrderId,
          validUntil: periodEnd.toISOString(),
        }),
        sendAdminPaymentAlert(userEmail, {
          invoiceNumber,
          planName: plan.name,
          amount: plan.amount,
          paymentId: effectivePaymentId,
          orderId: effectiveOrderId,
        }),
      ]).catch((e) => console.error('[Invoice dispatch error]:', e));
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription successfully activated!',
      subscription: {
        planId: plan.id,
        planName: plan.name,
        status: 'active',
        validUntil: periodEnd.toISOString(),
        invoiceNumber,
      },
    });
  } catch (error: any) {
    console.error('[verify-payment error]:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
}
