import { createAdminClient } from '@/lib/supabase-server';
import { sendPlatformEmail } from '@/lib/email-service';
import { renderTaxInvoiceTemplate, renderAdminPaymentAlertTemplate } from '@/lib/email-templates';

export * from './subscription-plans';
import { SubscriptionStatus } from './subscription-plans';


/**
 * Check if the user is permitted to use active pipelines (fails if expired)
 */
export async function assertActiveSubscription(userId?: string | null): Promise<{ allowed: boolean; error?: string }> {
  if (!userId) return { allowed: true };
  const sub = await getSubscriptionStatus(userId);
  if (sub.isAdmin) return { allowed: true };
  if (sub.isLocked) {
    return {
      allowed: false,
      error: 'Your ReachOut AI subscription has expired. Please renew your plan to continue using automated services.',
    };
  }
  return { allowed: true };
}

/**
 * Check if the user is an administrator
 */
export function isUserAdmin(email?: string | null): boolean {
  if (!email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS || 'yuvamk6@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

/**
 * Retrieve current subscription status for a user
 */
export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const supabase = createAdminClient();

  // 1. Fetch user's email from auth
  const { data: userData } = await supabase.auth.admin.getUserById(userId);
  const userEmail = userData?.user?.email?.toLowerCase();
  const isAdmin = isUserAdmin(userEmail);

  if (isAdmin) {
    return {
      userId,
      planId: 'enterprise',
      planName: 'Admin VIP Unlimited',
      status: 'active',
      amount: 0,
      currentPeriodStart: new Date(Date.now() - 30 * 86400000).toISOString(),
      currentPeriodEnd: new Date(Date.now() + 365 * 86400000).toISOString(),
      daysLeft: 365,
      isLocked: false,
      isExpiringSoon: false,
      isAdmin: true,
      invoiceNumber: 'INV-ADMIN-VIP',
    };
  }

  // 2. Query user_subscriptions table
  const { data: sub } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = new Date();

  if (!sub) {
    // If no subscription exists, create an initial 3-day Free Trial
    const trialEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const invoiceNum = `INV-${Date.now().toString().slice(-6)}`;

    const { data: newSub } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        plan_id: 'free_trial',
        plan_name: '3-Day Free Trial',
        status: 'trial',
        amount: 0,
        currency: 'INR',
        current_period_start: now.toISOString(),
        current_period_end: trialEnd.toISOString(),
        invoice_number: invoiceNum,
      })
      .select()
      .maybeSingle();

    const record = newSub || {
      plan_id: 'free_trial',
      plan_name: '3-Day Free Trial',
      status: 'trial',
      amount: 0,
      current_period_start: now.toISOString(),
      current_period_end: trialEnd.toISOString(),
      invoice_number: invoiceNum,
    };

    const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      userId,
      planId: record.plan_id,
      planName: record.plan_name,
      status: 'trial',
      amount: 0,
      currentPeriodStart: record.current_period_start,
      currentPeriodEnd: record.current_period_end,
      daysLeft: Math.max(0, daysLeft),
      isLocked: false,
      isExpiringSoon: daysLeft <= 1,
      isAdmin: false,
      invoiceNumber: record.invoice_number,
    };
  }

  const periodEnd = new Date(sub.current_period_end);
  const diffMs = periodEnd.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let calculatedStatus: 'active' | 'trial' | 'expiring_soon' | 'expired' | 'cancelled' = sub.status;
  let isLocked = false;
  let isExpiringSoon = false;

  if (diffMs <= 0 || sub.status === 'expired') {
    calculatedStatus = 'expired';
    isLocked = true;
  } else if (daysLeft <= 3) {
    calculatedStatus = 'expiring_soon';
    isExpiringSoon = true;
  } else {
    calculatedStatus = sub.plan_id === 'free_trial' ? 'trial' : 'active';
  }

  return {
    id: sub.id,
    userId,
    planId: sub.plan_id,
    planName: sub.plan_name,
    status: calculatedStatus,
    amount: Number(sub.amount || 0),
    currentPeriodStart: sub.current_period_start,
    currentPeriodEnd: sub.current_period_end,
    daysLeft: Math.max(0, daysLeft),
    isLocked,
    isExpiringSoon,
    isAdmin: false,
    razorpayPaymentId: sub.razorpay_payment_id,
    invoiceNumber: sub.invoice_number,
  };
}

/**
 * Dispatch HTML subscription invoice email to user
 */
export async function sendSubscriptionInvoiceEmail(
  userEmail: string,
  invoiceData: {
    invoiceNumber: string;
    planName: string;
    amount: number;
    paymentId: string;
    orderId: string;
    validUntil: string;
  }
) {
  try {
    const htmlContent = renderTaxInvoiceTemplate({
      invoiceNumber: invoiceData.invoiceNumber,
      orderId: invoiceData.orderId,
      paymentId: invoiceData.paymentId,
      planName: invoiceData.planName,
      amount: invoiceData.amount,
      userEmail,
      billingDate: new Date().toLocaleDateString(),
      validUntil: invoiceData.validUntil,
    });

    await sendPlatformEmail({
      to: userEmail,
      fromName: 'ReachOut AI Billing',
      subject: `🎉 Tax Invoice ${invoiceData.invoiceNumber} - ReachOut AI Subscription Active`,
      html: htmlContent,
      text: `Your payment of ₹${invoiceData.amount} for ${invoiceData.planName} was successful. Invoice #: ${invoiceData.invoiceNumber}, Payment ID: ${invoiceData.paymentId}.`,
    });
  } catch (err) {
    console.error('[sendSubscriptionInvoiceEmail] error:', err);
  }
}

/**
 * Dispatch Admin payment alert email to yuvamk6@gmail.com
 */
export async function sendAdminPaymentAlert(
  userEmail: string,
  invoiceData: {
    invoiceNumber: string;
    planName: string;
    amount: number;
    paymentId: string;
    orderId: string;
  }
) {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'yuvamk6@gmail.com';
    const htmlContent = renderAdminPaymentAlertTemplate({
      subscriberEmail: userEmail,
      planName: invoiceData.planName,
      amount: invoiceData.amount,
      orderId: invoiceData.orderId,
      paymentId: invoiceData.paymentId,
      validUntil: new Date(Date.now() + 30 * 86400000).toLocaleDateString(),
    });

    await sendPlatformEmail({
      to: adminEmail,
      fromName: 'ReachOut AI Revenue Bot',
      subject: `🔔 New Revenue: ₹${invoiceData.amount} from ${userEmail} (${invoiceData.planName})`,
      html: htmlContent,
      text: `New subscription payment received: ₹${invoiceData.amount} from ${userEmail} for ${invoiceData.planName}. Payment ID: ${invoiceData.paymentId}.`,
    });
  } catch (err) {
    console.error('[sendAdminPaymentAlert] error:', err);
  }
}
