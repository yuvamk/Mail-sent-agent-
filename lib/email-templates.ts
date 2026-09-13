/**
 * ReachOut AI - High-End Branded HTML Email Template System
 * Responsive, White SaaS design system with vibrant indigo/blue accents.
 */

interface BaseEmailWrapperProps {
  preheader?: string;
  badgeText?: string;
  badgeColor?: string;
  headerTitle: string;
  headerSubtitle?: string;
  bodyHtml: string;
  footerNote?: string;
}

export function wrapEmailLayout({
  preheader = 'ReachOut AI Platform Notification',
  badgeText = 'OFFICIAL NOTIFICATION',
  badgeColor = '#38bdf8',
  headerTitle,
  headerSubtitle,
  bodyHtml,
  footerNote = 'This is an automated security and transactional message from ReachOut AI.',
}: BaseEmailWrapperProps): string {
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${headerTitle}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .mobile-p-4 { padding: 20px !important; }
      .otp-digit { width: 36px !important; height: 46px !important; font-size: 22px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Preheader -->
  <div style="display: none; max-height: 0px; overflow: hidden;">
    ${preheader}
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 50%, #2563eb 100%); padding: 36px 32px; text-align: center; color: #ffffff;">
              <div style="display: inline-block; padding: 4px 12px; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 9999px; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: ${badgeColor}; margin-bottom: 12px;">
                ${badgeText}
              </div>
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.2;">
                ${headerTitle}
              </h1>
              ${
                headerSubtitle
                  ? `<p style="margin: 8px 0 0 0; font-size: 14px; color: #e0e7ff; font-weight: 400; line-height: 1.5;">${headerSubtitle}</p>`
                  : ''
              }
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td class="mobile-p-4" style="padding: 36px 32px; color: #1e293b; font-size: 14px; line-height: 1.6;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 24px 32px; text-align: center; color: #64748b; font-size: 12px; line-height: 1.6;">
              <p style="margin: 0 0 8px 0; font-weight: 600; color: #334155;">
                ReachOut AI &bull; AI-Powered Job Outreach & LinkedIn Thought Leadership
              </p>
              <p style="margin: 0 0 12px 0; color: #94a3b8; font-size: 11px;">
                ${footerNote}
              </p>
              <div style="font-size: 11px; color: #94a3b8;">
                <a href="https://mail-sent-agent.onrender.com/" target="_blank" style="color: #4f46e5; text-decoration: none; font-weight: 600;">Web Platform</a> &bull;
                <a href="https://mail-sent-agent.onrender.com/billing" target="_blank" style="color: #4f46e5; text-decoration: none; font-weight: 600;">Subscription Center</a> &bull;
                <a href="mailto:yuvamk6@gmail.com" style="color: #4f46e5; text-decoration: none; font-weight: 600;">Contact Support</a>
              </div>
              <p style="margin: 12px 0 0 0; font-size: 10px; color: #cbd5e1;">
                &copy; ${currentYear} ReachOut AI Platform. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * 1. Branded 6-Digit Email OTP Template
 */
export function renderOtpEmailTemplate(otpCode: string, userEmail: string): string {
  const digits = otpCode.split('');

  const bodyHtml = `
    <p style="margin-top: 0; font-size: 15px; color: #334155; line-height: 1.6;">
      Hello,
    </p>
    <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
      We received a sign-in or verification request for your ReachOut AI account (<strong style="color: #0f172a;">${userEmail}</strong>). Use your secure 6-digit one-time passcode below to continue:
    </p>

    <!-- OTP Display Box -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 28px;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin-bottom: 12px;">
        Your Verification Passcode
      </div>
      <div style="display: inline-block;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="6">
          <tr>
            ${digits
              .map(
                (d) => `
              <td class="otp-digit" style="width: 44px; height: 54px; background-color: #ffffff; border: 2px solid #6366f1; border-radius: 10px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 26px; font-weight: 800; color: #1e1b4b; text-align: center; vertical-align: middle; box-shadow: 0 2px 6px rgba(99, 102, 241, 0.15);">
                ${d}
              </td>
            `
              )
              .join('')}
          </tr>
        </table>
      </div>
      <p style="margin: 14px 0 0 0; font-size: 12px; color: #64748b;">
        ⏱️ Valid for <strong>10 minutes</strong>. Never share this code with anyone.
      </p>
    </div>

    <!-- Security Advisory -->
    <div style="border-left: 3px solid #f59e0b; background-color: #fffbeb; padding: 12px 16px; border-radius: 0 10px 10px 0; margin-bottom: 20px;">
      <p style="margin: 0; font-size: 12px; color: #92400e; line-height: 1.5;">
        <strong>Security Notice:</strong> If you did not request this login passcode, you can safely ignore this email. Your workspace remains secure.
      </p>
    </div>
  `;

  return wrapEmailLayout({
    preheader: `Your ReachOut AI verification code is ${otpCode}`,
    badgeText: 'SECURITY VERIFICATION',
    badgeColor: '#a5b4fc',
    headerTitle: 'Your Verification Code',
    headerSubtitle: 'One-time authentication passcode for your ReachOut AI account',
    bodyHtml,
    footerNote: 'ReachOut AI security dispatch via Brevo SMTP relay.',
  });
}

/**
 * 2. Branded Tax Invoice & Subscription Receipt Template
 */
export function renderTaxInvoiceTemplate(invoiceData: {
  invoiceNumber: string;
  orderId: string;
  paymentId: string;
  planName: string;
  amount: number;
  userEmail: string;
  billingDate: string;
  validUntil: string;
}): string {
  const bodyHtml = `
    <p style="margin-top: 0; font-size: 15px; color: #334155; line-height: 1.6;">
      Dear Customer,
    </p>
    <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 20px;">
      Thank you for subscribing to <strong style="color: #0f172a;">ReachOut AI</strong>! Your payment has been processed successfully via Razorpay. Below is your official Tax Invoice and subscription receipt:
    </p>

    <!-- Invoice Summary Box -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin-bottom: 24px; font-size: 12px;">
      <tr>
        <td style="padding: 6px 0; color: #64748b;"><strong>Invoice Number:</strong></td>
        <td align="right" style="padding: 6px 0; font-family: monospace; font-weight: 700; color: #0f172a;">${invoiceData.invoiceNumber}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b;"><strong>Transaction Date:</strong></td>
        <td align="right" style="padding: 6px 0; color: #0f172a;">${invoiceData.billingDate}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b;"><strong>Razorpay Order ID:</strong></td>
        <td align="right" style="padding: 6px 0; font-family: monospace; color: #0f172a;">${invoiceData.orderId}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b;"><strong>Razorpay Payment ID:</strong></td>
        <td align="right" style="padding: 6px 0; font-family: monospace; color: #0f172a;">${invoiceData.paymentId}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b;"><strong>Account Email:</strong></td>
        <td align="right" style="padding: 6px 0; font-weight: 600; color: #0f172a;">${invoiceData.userEmail}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b;"><strong>Active Period:</strong></td>
        <td align="right" style="padding: 6px 0; font-weight: 600; color: #16a34a;">Valid until ${invoiceData.validUntil}</td>
      </tr>
    </table>

    <!-- Line Item Breakdown -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin-bottom: 24px;">
      <thead>
        <tr style="border-bottom: 2px solid #e2e8f0;">
          <th align="left" style="padding: 10px 0; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700;">Item / Plan Description</th>
          <th align="right" style="padding: 10px 0; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700;">Amount (INR)</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 12px 0;">
            <div style="font-weight: 700; color: #0f172a; font-size: 14px;">${invoiceData.planName}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
              Full AI Outreach Pipeline, 3-Key Gemini Pool, Groq Failover & LinkedIn Studio
            </div>
          </td>
          <td align="right" style="padding: 12px 0; font-size: 15px; font-weight: 700; color: #0f172a;">
            ₹${invoiceData.amount}
          </td>
        </tr>
        <tr style="border-top: 2px solid #e2e8f0;">
          <td style="padding: 14px 0; font-size: 14px; font-weight: 800; color: #0f172a;">Total Paid (Inclusive of GST)</td>
          <td align="right" style="padding: 14px 0; font-size: 20px; font-weight: 900; color: #4f46e5;">
            ₹${invoiceData.amount}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Direct CTA -->
    <div style="text-align: center; margin: 30px 0 10px 0;">
      <a href="https://mail-sent-agent.onrender.com/leads" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #4f46e5, #3b82f6); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 12px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);">
        Open Your Dashboard &rarr;
      </a>
    </div>
  `;

  return wrapEmailLayout({
    preheader: `Tax Invoice ${invoiceData.invoiceNumber} for your ReachOut AI subscription`,
    badgeText: 'TAX INVOICE & RECEIPT',
    badgeColor: '#86efac',
    headerTitle: 'Payment Received',
    headerSubtitle: `Invoice ${invoiceData.invoiceNumber} &bull; ${invoiceData.planName}`,
    bodyHtml,
    footerNote: 'Please retain this email as an official tax invoice and proof of subscription payment.',
  });
}

/**
 * 3. Admin Payment Alert Email Template
 */
export function renderAdminPaymentAlertTemplate(paymentData: {
  subscriberEmail: string;
  planName: string;
  amount: number;
  orderId: string;
  paymentId: string;
  validUntil: string;
}): string {
  const bodyHtml = `
    <div style="border-left: 4px solid #10b981; background-color: #ecfdf5; padding: 14px 18px; border-radius: 0 12px 12px 0; margin-bottom: 24px;">
      <h3 style="margin: 0; color: #065f46; font-size: 15px; font-weight: 800;">
        🎉 New Revenue Event: ₹${paymentData.amount} INR
      </h3>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #047857;">
        A customer has completed a subscription payment on ReachOut AI.
      </p>
    </div>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; font-size: 13px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 6px 0; color: #64748b;"><strong>Subscriber:</strong></td>
        <td align="right" style="padding: 6px 0; font-weight: 700; color: #0f172a;">${paymentData.subscriberEmail}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b;"><strong>Plan Purchased:</strong></td>
        <td align="right" style="padding: 6px 0; font-weight: 600; color: #4f46e5;">${paymentData.planName}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b;"><strong>Amount Paid:</strong></td>
        <td align="right" style="padding: 6px 0; font-size: 15px; font-weight: 900; color: #059669;">₹${paymentData.amount}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b;"><strong>Razorpay Payment ID:</strong></td>
        <td align="right" style="padding: 6px 0; font-family: monospace; color: #334155;">${paymentData.paymentId}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b;"><strong>Razorpay Order ID:</strong></td>
        <td align="right" style="padding: 6px 0; font-family: monospace; color: #334155;">${paymentData.orderId}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748b;"><strong>Active Period End:</strong></td>
        <td align="right" style="padding: 6px 0; font-weight: 600; color: #0f172a;">${paymentData.validUntil}</td>
      </tr>
    </table>

    <div style="text-align: center;">
      <a href="https://mail-sent-agent.onrender.com/admin" target="_blank" style="display: inline-block; padding: 12px 28px; background-color: #0f172a; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; border-radius: 10px;">
        Open Admin Control Center &rarr;
      </a>
    </div>
  `;

  return wrapEmailLayout({
    preheader: `New ₹${paymentData.amount} payment received from ${paymentData.subscriberEmail}`,
    badgeText: 'ADMIN REAL-TIME REVENUE ALERT',
    badgeColor: '#6ee7b7',
    headerTitle: 'New Subscription Paid',
    headerSubtitle: `₹${paymentData.amount} received from ${paymentData.subscriberEmail}`,
    bodyHtml,
    footerNote: 'This executive notification is dispatched strictly to verified platform administrators.',
  });
}

/**
 * 4. Branded Welcome Onboarding Template
 */
export function renderWelcomeEmailTemplate(userName: string, userEmail: string): string {
  const bodyHtml = `
    <p style="margin-top: 0; font-size: 15px; color: #334155; line-height: 1.6;">
      Welcome, <strong style="color: #0f172a;">${userName || 'Job Seeker & Creator'}</strong>!
    </p>
    <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
      Welcome to <strong>ReachOut AI</strong> — your dual-engine career automation platform. Whether you are running high-volume cold outreach to recruiters or building daily LinkedIn authority, your workspace is ready.
    </p>

    <!-- Quick Start Steps -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 28px;">
      <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 14px;">
        🚀 Quick-Start Checklist:
      </div>
      
      <div style="margin-bottom: 12px; font-size: 13px; color: #334155;">
        <strong>1. Upload Your Resume:</strong> Head to <em>Resume Studio</em> and upload your PDF to extract your core technical accomplishments.
      </div>
      <div style="margin-bottom: 12px; font-size: 13px; color: #334155;">
        <strong>2. Import Recruiter Leads:</strong> Drop any Excel/CSV spreadsheet into the <em>Importer</em> with instant dynamic column mapping.
      </div>
      <div style="margin-bottom: 12px; font-size: 13px; color: #334155;">
        <strong>3. Tune AI Prompts:</strong> Customize your cold email system prompt in <em>Settings</em> with one-click tone presets.
      </div>
      <div style="font-size: 13px; color: #334155;">
        <strong>4. Publish LinkedIn Research:</strong> Browse the live <em>Tech Radar</em> (TechCrunch, HackerNews, ArXiv) and post with AI visuals.
      </div>
    </div>

    <!-- Direct CTA -->
    <div style="text-align: center; margin: 28px 0 10px 0;">
      <a href="https://mail-sent-agent.onrender.com/leads" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #4f46e5, #3b82f6); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 12px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);">
        Launch Workspace &rarr;
      </a>
    </div>
  `;

  return wrapEmailLayout({
    preheader: 'Welcome to ReachOut AI! Get started with your automated outreach and LinkedIn presence.',
    badgeText: 'WELCOME ONBOARD',
    badgeColor: '#93c5fd',
    headerTitle: 'Welcome to ReachOut AI',
    headerSubtitle: 'Your dual-engine career automation platform is ready',
    bodyHtml,
    footerNote: 'You received this email because you signed up for ReachOut AI.',
  });
}

/**
 * 5. Pre-Expiry Warning Email Template
 */
export function renderExpiryWarningTemplate(userName: string, planName: string, daysLeft: number): string {
  const bodyHtml = `
    <div style="border-left: 4px solid #f59e0b; background-color: #fffbeb; padding: 14px 18px; border-radius: 0 12px 12px 0; margin-bottom: 24px;">
      <h3 style="margin: 0; color: #92400e; font-size: 15px; font-weight: 800;">
        ⚠️ Subscription Expiring in ${daysLeft} ${daysLeft === 1 ? 'Day' : 'Days'}
      </h3>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #b45309;">
        Your ${planName} plan will expire soon. Renew today to prevent any interruption in your automated outreach pipelines.
      </p>
    </div>

    <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
      When your subscription expires, automated services (AI draft generation, SMTP email dispatch, and LinkedIn 1-click publishing) are paused until renewal.
    </p>

    <!-- Direct CTA -->
    <div style="text-align: center; margin: 28px 0 10px 0;">
      <a href="https://mail-sent-agent.onrender.com/billing" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 12px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.35);">
        Renew Subscription with Razorpay &rarr;
      </a>
    </div>
  `;

  return wrapEmailLayout({
    preheader: `Your ReachOut AI subscription expires in ${daysLeft} days`,
    badgeText: 'SUBSCRIPTION NOTICE',
    badgeColor: '#fde68a',
    headerTitle: 'Subscription Ending Soon',
    headerSubtitle: `${daysLeft} days remaining on your ${planName} plan`,
    bodyHtml,
    footerNote: 'Manage your subscription and invoices anytime in the Billing Center.',
  });
}
