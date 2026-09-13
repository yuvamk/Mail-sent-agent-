export interface PlanConfig {
  id: string;
  name: string;
  amount: number; // in INR
  periodDays: number;
  description: string;
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<string, PlanConfig> = {
  pro_monthly: {
    id: 'pro_monthly',
    name: 'Pro Career Monthly',
    amount: 499,
    periodDays: 30,
    description: 'For ambitious engineers actively running daily outreach and LinkedIn personal branding.',
    features: [
      'Unlimited Dynamic Excel & CSV Lead Uploads',
      'Contextual Resume Matching (PDF Parser)',
      'Google Gemini 1.5 Flash 3-Key Pool Auto-Rotation',
      'Groq Llama 3.3 70B Failover Engine',
      'LinkedIn Thought Leadership Studio & Live Tech Radar',
      'Direct 1-Click LinkedIn Publishing with AI Visuals',
      'Brevo SMTP + Inbound IMAP Response Tracker',
      'Real-Time Token Analytics in Indian Rupees (₹)',
    ],
  },
  pro_annual: {
    id: 'pro_annual',
    name: 'Pro Career Annual (Save 17%)',
    amount: 4999,
    periodDays: 365,
    description: 'Annual VIP package for relentless outreach, continuous authority building, and career growth.',
    features: [
      'All Pro Monthly Features for 12 Months',
      'Priority Rate-Limit Queue & Faster LLM Response',
      'Advanced ArXiv CS.AI Deep-Dive Summaries',
      'Priority Support & Dedicated Onboarding',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Agency Tier',
    amount: 1499,
    periodDays: 30,
    description: 'High-volume recruiting and agency tier with multi-user pooling and admin telemetry.',
    features: [
      'Multi-Account Recruiter Pooling',
      'Custom Domain White-Label & Dedicated IP Warmup',
      'Full Admin Analytics & Multi-User Governance',
      'Claude 3.5 Sonnet / Opus Deep Synthesis Engine',
    ],
  },
};

export interface SubscriptionStatus {
  id?: string;
  userId: string;
  planId: string;
  planName: string;
  status: 'active' | 'trial' | 'expiring_soon' | 'expired' | 'cancelled';
  amount: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  daysLeft: number;
  isLocked: boolean;
  isExpiringSoon: boolean;
  isAdmin: boolean;
  razorpayPaymentId?: string;
  invoiceNumber?: string;
}
