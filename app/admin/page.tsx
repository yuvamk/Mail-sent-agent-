'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Mail,
  Send,
  Linkedin,
  FileSpreadsheet,
  FileText,
  DollarSign,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Server,
  Key,
  ExternalLink,
  ChevronDown,
  Cpu,
  Sparkles,
  ArrowUpRight,
  Clock,
  CreditCard,
  Check,
  PlusCircle,
  Lock,
} from 'lucide-react';

interface UserBreakdown {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  isAdmin: boolean;
  candidateName: string | null;
  leadsCount: number;
  resumesCount: number;
  draftsCount: number;
  sentCount: number;
  linkedinDraftsCount: number;
  linkedinPostedCount: number;
  spendINR: number;
  totalTokens: number;
  integrations: {
    hasGemini: boolean;
    hasGroq: boolean;
    hasAnthropic: boolean;
    hasSmtp: boolean;
    hasBrevo: boolean;
    hasLinkedIn: boolean;
  };
  subscription?: {
    plan_name: string;
    status: string;
    current_period_end: string;
    amount: number;
    invoice_number?: string;
    razorpay_payment_id?: string;
  };
  recentLeads: Array<{ id: string; company: string; imported_at: string }>;
  recentPosts: Array<{ id: string; topic: string; status: string; created_at: string }>;
}

interface AdminStats {
  totalRegisteredUsers: number;
  totalLeads: number;
  totalEmailsSent: number;
  totalDraftsCreated: number;
  totalLinkedInPostsPublished: number;
  totalLinkedInPostsDrafted: number;
  totalResumesUploaded: number;
  totalSpendINR: number;
  totalTokensUsed: number;
  totalSubscriptionRevenue: number;
  activeSubscribersCount: number;
  expiredSubscribersCount: number;
  expiringSoonSubscribersCount: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserBreakdown[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Admin Active Tab: 'subscriptions' | 'users' | 'system'
  const [adminTab, setAdminTab] = useState<'subscriptions' | 'users' | 'system'>('subscriptions');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'leads' | 'sent' | 'linkedin' | 'spend'>('newest');
  const [selectedUser, setSelectedUser] = useState<UserBreakdown | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setIsRefreshing(true);
    setActionSuccess(null);
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session?.user) {
        router.push('/login?redirect=/admin');
        return;
      }

      setCurrentUserEmail(session.user.email || null);

      const res = await fetch('/api/admin/stats', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setIsAuthorized(false);
        setErrorMessage(data.error || 'Access denied: Admin authorization required.');
      } else {
        setIsAuthorized(true);
        setStats(data.stats);
        setUsers(data.users || []);
        setSystemHealth(data.systemHealth || {});
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to connect to admin telemetry');
      setIsAuthorized(false);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Perform Admin Subscription Override
  const handleSubscriptionAction = async (targetUserId: string, action: string, days?: number, newStatus?: string) => {
    setActionLoading(`${targetUserId}-${action}`);
    setActionSuccess(null);
    setErrorMessage(null);

    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      const res = await fetch('/api/admin/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          targetUserId,
          action,
          days,
          newStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Action failed');
      }

      setActionSuccess(`✓ ${data.message}`);
      await fetchAdminData();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Admin action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = useMemo(() => {
    let result = [...users];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.candidateName && u.candidateName.toLowerCase().includes(q)) ||
          u.id.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'leads') {
      result.sort((a, b) => b.leadsCount - a.leadsCount);
    } else if (sortBy === 'sent') {
      result.sort((a, b) => b.sentCount - a.sentCount);
    } else if (sortBy === 'linkedin') {
      result.sort((a, b) => b.linkedinPostedCount - a.linkedinPostedCount);
    } else if (sortBy === 'spend') {
      result.sort((a, b) => b.spendINR - a.spendINR);
    } else {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [users, searchQuery, sortBy]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-bold text-slate-700">Connecting to ReachOut AI Admin Control Center...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 rounded-3xl bg-white border border-slate-200 shadow-xl text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-950">Administrator Access Required</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {errorMessage || 'This control center is restricted to authorized platform administrators.'}
          </p>
        </div>
        <Link
          href="/leads"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-xs hover:bg-indigo-700 transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-rose-600" /> Superadmin Mission Control
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950">Platform Governance & Payments</h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Real-time subscriber management, Razorpay billing revenue, and multi-tenant telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAdminData}
            disabled={isRefreshing}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Action Notification */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Admin Section Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold">
        <button
          onClick={() => setAdminTab('subscriptions')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            adminTab === 'subscriptions'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80 font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4 text-indigo-600" />
          <span>Subscribers & Razorpay Payments</span>
          {stats && (
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-mono">
              ₹{stats.totalSubscriptionRevenue}
            </span>
          )}
        </button>

        <button
          onClick={() => setAdminTab('users')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            adminTab === 'users'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80 font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-indigo-600" />
          <span>Registered Users ({users.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('system')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            adminTab === 'system'
              ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80 font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Server className="w-4 h-4 text-indigo-600" />
          <span>System Health & API Routing</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SUBSCRIBERS & RAZORPAY PAYMENTS */}
      {/* ========================================================================= */}
      {adminTab === 'subscriptions' && stats && (
        <div className="space-y-6">
          {/* Revenue KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Total Subscription Revenue</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 flex items-center gap-1.5">
                <DollarSign className="w-6 h-6 text-emerald-600" />
                ₹{stats.totalSubscriptionRevenue.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500">Collected via Razorpay INR</p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Active Paid Subscribers</span>
              <div className="text-2xl sm:text-3xl font-black text-indigo-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                {stats.activeSubscribersCount}
              </div>
              <p className="text-[11px] text-slate-500">Full pipeline access enabled</p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Expiring Soon (&le; 3 Days)</span>
              <div className="text-2xl sm:text-3xl font-black text-amber-700 flex items-center gap-1.5">
                <Clock className="w-6 h-6 text-amber-600" />
                {stats.expiringSoonSubscribersCount}
              </div>
              <p className="text-[11px] text-slate-500">Amber warning banner active</p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Expired Subscriptions</span>
              <div className="text-2xl sm:text-3xl font-black text-rose-700 flex items-center gap-1.5">
                <Lock className="w-6 h-6 text-rose-600" />
                {stats.expiredSubscribersCount}
              </div>
              <p className="text-[11px] text-slate-500">Automated lock & paywall active</p>
            </div>
          </div>

          {/* Subscriber Management Table */}
          <div className="rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-950">Subscriber Control Center</h3>
                <p className="text-xs text-slate-500">
                  Override access, grant trial extensions, or force subscription activation/lockout in real time.
                </p>
              </div>
              <input
                type="text"
                placeholder="Search subscriber email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 w-full sm:w-64 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">Subscriber</th>
                    <th className="p-4">Plan Name</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Valid Until</th>
                    <th className="p-4">Amount Paid</th>
                    <th className="p-4 text-center">Admin Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredUsers.map((u) => {
                    const sub = u.subscription || {
                      plan_name: u.isAdmin ? 'Admin VIP' : 'Free Trial',
                      status: u.isAdmin ? 'active' : 'trial',
                      current_period_end: new Date().toISOString(),
                      amount: 0,
                    };
                    const isBusy = actionLoading?.startsWith(u.id);

                    return (
                      <tr key={u.id} className="hover:bg-indigo-50/20 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-slate-900 truncate max-w-[220px]" title={u.email}>
                            {u.email}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {u.id.slice(0, 8)}...</div>
                        </td>

                        <td className="p-4 font-semibold text-slate-800">{sub.plan_name}</td>

                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              sub.status === 'active' || u.isAdmin
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : sub.status === 'expiring_soon'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : sub.status === 'trial'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {u.isAdmin ? 'VIP ADMIN' : sub.status}
                          </span>
                        </td>

                        <td className="p-4 font-mono text-slate-600 text-[11px]">
                          {u.isAdmin ? 'Lifetime' : new Date(sub.current_period_end).toLocaleDateString()}
                        </td>

                        <td className="p-4 font-bold text-slate-900">
                          ₹{sub.amount || 0}
                        </td>

                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleSubscriptionAction(u.id, 'extend', 30)}
                              disabled={isBusy}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold transition-colors"
                              title="Extend plan by 30 days"
                            >
                              +30 Days
                            </button>

                            <button
                              onClick={() => handleSubscriptionAction(u.id, 'set_status', undefined, 'active')}
                              disabled={isBusy}
                              className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition-colors"
                              title="Force set status to Active"
                            >
                              Activate
                            </button>

                            <button
                              onClick={() => handleSubscriptionAction(u.id, 'set_status', undefined, 'expired')}
                              disabled={isBusy}
                              className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold transition-colors"
                              title="Force set status to Expired (Locks services)"
                            >
                              Expire
                            </button>

                            <button
                              onClick={() => handleSubscriptionAction(u.id, 'grant_vip')}
                              disabled={isBusy}
                              className="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-[11px] font-bold transition-colors"
                              title="Grant 1-Year VIP Access"
                            >
                              VIP
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: REGISTERED USERS & WORKSPACES */}
      {/* ========================================================================= */}
      {adminTab === 'users' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Total Registered Users</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-950">{stats.totalRegisteredUsers}</div>
              <p className="text-[11px] text-slate-500">Unique tenant workspaces</p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Leads Ingested</span>
              <div className="text-2xl sm:text-3xl font-black text-indigo-700">{stats.totalLeads}</div>
              <p className="text-[11px] text-slate-500">Across all uploaded sheets</p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">Outreach Mails Sent</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700">{stats.totalEmailsSent}</div>
              <p className="text-[11px] text-slate-500">Delivered via Brevo SMTP</p>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase font-bold">LinkedIn Posts Published</span>
              <div className="text-2xl sm:text-3xl font-black text-blue-700">{stats.totalLinkedInPostsPublished}</div>
              <p className="text-[11px] text-slate-500">Live via LinkedIn API v202608</p>
            </div>
          </div>

          {/* User Details Table */}
          <div className="rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-base font-bold text-slate-950">Tenant Breakdown</h3>
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="newest">Sort by Newest</option>
                  <option value="leads">Sort by Leads</option>
                  <option value="sent">Sort by Emails Sent</option>
                  <option value="linkedin">Sort by LinkedIn Posts</option>
                  <option value="spend">Sort by Token Spend</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4">User</th>
                    <th className="p-4 text-center">Leads</th>
                    <th className="p-4 text-center">Mails Sent</th>
                    <th className="p-4 text-center">LinkedIn</th>
                    <th className="p-4">Integrations</th>
                    <th className="p-4">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 truncate max-w-[200px]" title={u.email}>
                          {u.email}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {u.candidateName || 'Name unset'}
                        </div>
                      </td>
                      <td className="p-4 text-center font-bold text-slate-900">{u.leadsCount}</td>
                      <td className="p-4 text-center font-bold text-emerald-700">{u.sentCount}</td>
                      <td className="p-4 text-center font-bold text-blue-700">{u.linkedinPostedCount}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono ${
                              u.integrations.hasGemini ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            Gemini
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono ${
                              u.integrations.hasSmtp ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            SMTP
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono ${
                              u.integrations.hasLinkedIn ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            LI
                          </span>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-slate-500 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SYSTEM HEALTH */}
      {/* ========================================================================= */}
      {adminTab === 'system' && systemHealth && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-600" /> System Infrastructure Health
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-500 text-[10px] uppercase font-bold">Postgres Database</span>
              <p className="font-bold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {systemHealth.database}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-500 text-[10px] uppercase font-bold">Google Gemini Pool</span>
              <p className="font-bold text-indigo-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" /> {systemHealth.geminiPool}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-500 text-[10px] uppercase font-bold">LinkedIn REST API</span>
              <p className="font-bold text-blue-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Version {systemHealth.linkedinApiVersion}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-500 text-[10px] uppercase font-bold">Payment Gateway</span>
              <p className="font-bold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Razorpay INR Engine ({systemHealth.razorpay})
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
