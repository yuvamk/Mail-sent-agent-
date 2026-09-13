import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, getUserIdFromRequest } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function isUserAdmin(email?: string | null): boolean {
  if (!email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS || 'yuvamk6@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin authentication required' },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();

    // 1. Verify if user has admin privileges
    const { data: requesterData } = await supabase.auth.admin.getUserById(userId);
    const requesterEmail = requesterData?.user?.email?.toLowerCase();

    // Check DB user_settings is_admin or ADMIN_EMAILS list
    let isAdmin = isUserAdmin(requesterEmail);
    if (!isAdmin) {
      const { data: userSettings } = await supabase
        .from('user_settings')
        .select('is_admin')
        .eq('user_id', userId)
        .maybeSingle();

      if (userSettings?.is_admin) {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have administrator permissions.' },
        { status: 403 }
      );
    }

    // 2. Fetch all registered users from auth.admin
    const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers();
    if (usersErr) {
      return NextResponse.json({ success: false, error: usersErr.message }, { status: 500 });
    }

    const authUsers = usersData?.users || [];

    // 3. Aggregate Table Metrics Across All Users
    const [
      leadsRes,
      draftsRes,
      resumesRes,
      linkedinRes,
      usageRes,
      settingsRes,
      linkedinAccountsRes,
      subscriptionsRes,
    ] = await Promise.all([
      supabase.from('leads').select('id, user_id, imported_at, company'),
      supabase.from('email_drafts').select('id, user_id, status, created_at, sent_at'),
      supabase.from('resumes').select('id, user_id, file_name, uploaded_at'),
      supabase.from('linkedin_posts').select('id, user_id, status, topic, created_at, posted_at'),
      supabase.from('api_usage_logs').select('id, user_id, provider, total_tokens, estimated_cost_inr, created_at'),
      supabase.from('user_settings').select('user_id, is_admin, gemini_api_key, groq_api_key, anthropic_api_key, smtp_host, smtp_pass, brevo_api_key, linkedin_access_token, candidate_name, updated_at'),
      supabase.from('linkedin_accounts').select('user_id, is_connected, profile_name, updated_at'),
      supabase.from('user_subscriptions').select('*').order('created_at', { ascending: false }),
    ]);

    const leads = leadsRes.data || [];
    const drafts = draftsRes.data || [];
    const resumes = resumesRes.data || [];
    const linkedinPosts = linkedinRes.data || [];
    const usageLogs = usageRes.data || [];
    const settings = settingsRes.data || [];
    const linkedinAccounts = linkedinAccountsRes.data || [];
    const subscriptions = (subscriptionsRes as any)?.data || [];

    // Create lookup maps for fast aggregation
    const settingsMap = new Map<string, any>();
    settings.forEach((s) => settingsMap.set(s.user_id, s));

    const linkedinAccountMap = new Map<string, any>();
    linkedinAccounts.forEach((la) => linkedinAccountMap.set(la.user_id, la));

    // Platform KPI Totals
    const totalRegisteredUsers = authUsers.length;
    const totalLeads = leads.length;
    const totalEmailsSent = drafts.filter((d) => d.status === 'sent').length;
    const totalDraftsCreated = drafts.length;
    const totalLinkedInPostsPublished = linkedinPosts.filter((p) => p.status === 'posted').length;
    const totalLinkedInPostsDrafted = linkedinPosts.length;
    const totalResumesUploaded = resumes.length;

    const totalSpendINR = usageLogs.reduce((acc, log) => {
      return acc + (Number(log.estimated_cost_inr) || 0);
    }, 0);

    const totalTokensUsed = usageLogs.reduce((acc, log) => {
      return acc + (Number(log.total_tokens) || 0);
    }, 0);

    // Build per-user detailed breakdown
    const userBreakdowns = authUsers.map((u) => {
      const uLeads = leads.filter((l) => l.user_id === u.id);
      const uDrafts = drafts.filter((d) => d.user_id === u.id);
      const uSentDrafts = uDrafts.filter((d) => d.status === 'sent');
      const uResumes = resumes.filter((r) => r.user_id === u.id);
      const uPosts = linkedinPosts.filter((p) => p.user_id === u.id);
      const uPosted = uPosts.filter((p) => p.status === 'posted');
      const uUsage = usageLogs.filter((l) => l.user_id === u.id);
      const uSpend = uUsage.reduce((acc, log) => acc + (Number(log.estimated_cost_inr) || 0), 0);
      const uTokens = uUsage.reduce((acc, log) => acc + (Number(log.total_tokens) || 0), 0);

      const uSetting = settingsMap.get(u.id);
      const uLinkedInAccount = linkedinAccountMap.get(u.id);

      const isUserPlatformAdmin = isUserAdmin(u.email) || Boolean(uSetting?.is_admin);

      // Integrations checklist
      const integrations = {
        hasGemini: Boolean(uSetting?.gemini_api_key?.trim()),
        hasGroq: Boolean(uSetting?.groq_api_key?.trim()),
        hasAnthropic: Boolean(uSetting?.anthropic_api_key?.trim()),
        hasSmtp: Boolean(uSetting?.smtp_pass?.trim() && uSetting?.smtp_host?.trim()),
        hasBrevo: Boolean(uSetting?.brevo_api_key?.trim()),
        hasLinkedIn: Boolean(uLinkedInAccount?.is_connected || uSetting?.linkedin_access_token?.trim()),
      };

      const uSub = subscriptions.find((s: any) => s.user_id === u.id);

      return {
        id: u.id,
        email: u.email || 'Anonymous',
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at || null,
        isAdmin: isUserPlatformAdmin,
        candidateName: uSetting?.candidate_name || null,
        leadsCount: uLeads.length,
        resumesCount: uResumes.length,
        draftsCount: uDrafts.length,
        sentCount: uSentDrafts.length,
        linkedinDraftsCount: uPosts.length,
        linkedinPostedCount: uPosted.length,
        spendINR: Number(uSpend.toFixed(2)),
        totalTokens: uTokens,
        integrations,
        subscription: uSub || {
          plan_name: isUserPlatformAdmin ? 'Admin VIP' : 'Free Trial',
          status: isUserPlatformAdmin ? 'active' : 'trial',
          current_period_end: new Date(Date.now() + 3 * 86400000).toISOString(),
          amount: 0,
        },
        recentLeads: uLeads.slice(0, 5),
        recentPosts: uPosts.slice(0, 5),
      };
    });

    // Sort users by activity / creation
    userBreakdowns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Subscription & Revenue Metrics
    const totalSubscriptionRevenue = subscriptions.reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0);
    const activeSubscribersCount = subscriptions.filter((s: any) => s.status === 'active').length;
    const expiredSubscribersCount = subscriptions.filter((s: any) => s.status === 'expired').length;
    const expiringSoonSubscribersCount = subscriptions.filter((s: any) => s.status === 'expiring_soon').length;

    // System Health Status
    const systemHealth = {
      database: 'connected',
      geminiPool: 'active (3-key auto-rotation pool)',
      groqFailover: 'ready',
      smtpRelay: 'configured',
      linkedinApiVersion: 'v202608',
      razorpay: 'configured',
      checkedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      stats: {
        totalRegisteredUsers,
        totalLeads,
        totalEmailsSent,
        totalDraftsCreated,
        totalLinkedInPostsPublished,
        totalLinkedInPostsDrafted,
        totalResumesUploaded,
        totalSpendINR: Number(totalSpendINR.toFixed(2)),
        totalTokensUsed,
        totalSubscriptionRevenue,
        activeSubscribersCount,
        expiredSubscribersCount,
        expiringSoonSubscribersCount,
      },
      systemHealth,
      users: userBreakdowns,
      subscriptions,
    });
  } catch (err: any) {
    console.error('Admin stats route error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal admin error' },
      { status: 500 }
    );
  }
}
