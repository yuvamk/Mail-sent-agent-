import { createAdminClient } from '@/lib/supabase-server';
import nodemailer from 'nodemailer';

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
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 50%, #7c3aed 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">ReachOut AI</h1>
          <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Official Tax Invoice & Subscription Receipt</p>
        </div>

        <!-- Invoice Details -->
        <div style="padding: 28px 24px; color: #1e293b;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px;">
            <div>
              <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Invoice Number</p>
              <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 700; color: #0f172a; font-family: monospace;">${invoiceData.invoiceNumber}</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Payment Status</p>
              <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 700; color: #16a34a; background: #dcfce7; padding: 2px 10px; border-radius: 9999px; display: inline-block;">PAID (₹ INR)</p>
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Billed To</p>
            <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 600; color: #0f172a;">${userEmail}</p>
          </div>

          <!-- Line Items Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                <th style="padding: 10px 12px; text-align: left; color: #475569;">Description</th>
                <th style="padding: 10px 12px; text-align: right; color: #475569;">Valid Until</th>
                <th style="padding: 10px 12px; text-align: right; color: #475569;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 14px 12px; font-weight: 600; color: #0f172a;">${invoiceData.planName}</td>
                <td style="padding: 14px 12px; text-align: right; color: #64748b;">${new Date(invoiceData.validUntil).toLocaleDateString()}</td>
                <td style="padding: 14px 12px; text-align: right; font-weight: 700; color: #0f172a;">₹${invoiceData.amount}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding: 12px; text-align: right; font-weight: 600; color: #64748b;">Total Paid:</td>
                <td style="padding: 12px; text-align: right; font-weight: 800; font-size: 16px; color: #4f46e5;">₹${invoiceData.amount}</td>
              </tr>
            </tbody>
          </table>

          <!-- Transaction Reference -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; font-size: 11px; color: #64748b; font-family: monospace; margin-bottom: 24px;">
            <p style="margin: 0 0 4px 0;"><strong>Razorpay Payment ID:</strong> ${invoiceData.paymentId}</p>
            <p style="margin: 0;"><strong>Order ID:</strong> ${invoiceData.orderId}</p>
          </div>

          <div style="text-align: center;">
            <a href="https://mail-sent-agent.onrender.com/leads" style="background: #4f46e5; color: #ffffff; padding: 12px 28px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 13px; display: inline-block;">Open Dashboard & Launch Pipelines &rarr;</a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8;">
          <p style="margin: 0;">ReachOut AI • Automated Career & Inbound Authority Platform</p>
          <p style="margin: 4px 0 0 0;">Need support? Contact support@reachout-ai.com or reply to this email.</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: '"ReachOut AI Billing" <yuvamk6@gmail.com>',
      to: userEmail,
      subject: `🎉 Invoice ${invoiceData.invoiceNumber} - Your ReachOut AI Subscription is Active!`,
      html: htmlContent,
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
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #16a34a; margin-top: 0;">💰 New Subscription Received!</h2>
        <p>A new customer has subscribed on ReachOut AI:</p>
        <ul>
          <li><strong>User Email:</strong> ${userEmail}</li>
          <li><strong>Plan:</strong> ${invoiceData.planName}</li>
          <li><strong>Amount Paid:</strong> ₹${invoiceData.amount} INR</li>
          <li><strong>Invoice #:</strong> ${invoiceData.invoiceNumber}</li>
          <li><strong>Razorpay Payment ID:</strong> ${invoiceData.paymentId}</li>
          <li><strong>Order ID:</strong> ${invoiceData.orderId}</li>
          <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
        </ul>
        <p><a href="https://mail-sent-agent.onrender.com/admin" style="background: #4f46e5; color: #fff; padding: 8px 16px; border-radius: 8px; text-decoration: none; font-size: 12px; font-weight: bold;">View in Admin Dashboard &rarr;</a></p>
      </div>
    `;

    await transporter.sendMail({
      from: '"ReachOut AI Alerts" <yuvamk6@gmail.com>',
      to: adminEmail,
      subject: `🔔 Payment Alert: ₹${invoiceData.amount} from ${userEmail} (${invoiceData.planName})`,
      html: htmlContent,
    });
  } catch (err) {
    console.error('[sendAdminPaymentAlert] error:', err);
  }
}
