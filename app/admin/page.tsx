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
  LogOut,
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

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'leads' | 'sent' | 'linkedin' | 'spend'>('newest');
  const [selectedUser, setSelectedUser] = useState<UserBreakdown | null>(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setIsRefreshing(true);
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session?.user) {
        router.push('/login?redirect=/admin');
        return;
      }

      setCurrentUserEmail(session.user.email || 'Admin');

      const res = await fetch(`/api/admin/stats?userId=${session.user.id}`, {
        headers: {
          Authorization: `Bearer ${session.access_token || ''}`,
          'x-user-id': session.user.id,
        },
      });

      const data = await res.json();

      if (res.status === 403 || res.status === 401 || !data.success) {
        setIsAuthorized(false);
        setErrorMessage(data.error || 'Access Denied: Administrator permissions required.');
        setLoading(false);
        return;
      }

      setIsAuthorized(true);
      setStats(data.stats);
      setUsers(data.users || []);
      setSystemHealth(data.systemHealth);
    } catch (err: any) {
      setIsAuthorized(false);
      setErrorMessage(err.message || 'Failed to authenticate admin session');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Filtered & Sorted Users
  const filteredUsers = useMemo(() => {
    let result = users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        (u.candidateName && u.candidateName.toLowerCase().includes(q))
      );
    });

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

  // Loading State
  if (loading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center animate-pulse shadow-xl shadow-rose-500/20">
          <ShieldAlert className="w-7 h-7 text-white" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-base font-bold text-white">Verifying Admin Access Credentials...</p>
          <p className="text-xs text-slate-500">Checking multi-tenant administrative privileges</p>
        </div>
      </div>
    );
  }

  // Unauthorized Access Screen
  if (!isAuthorized) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900 border border-red-900/60 shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-red-950/80 border border-red-800 text-red-400 flex items-center justify-center mx-auto shadow-lg shadow-red-950/50">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white">Administrator Access Required</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              {errorMessage || 'This control center is strictly restricted to platform administrators. Your current account does not have admin permissions.'}
            </p>
            {currentUserEmail && (
              <p className="text-[11px] font-mono text-slate-500 bg-slate-950 p-2 rounded-xl border border-slate-800">
                Logged in as: {currentUserEmail}
              </p>
            )}
          </div>
          <div className="pt-2 flex flex-col gap-2.5">
            <Link
              href="/leads"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/20"
            >
              Return to Your Dashboard
            </Link>
            <Link
              href="/login"
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Sign in with Admin Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-300">
      {/* Admin Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-500/25">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5 flex-wrap">
                System Administration & Control Center
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-rose-400" />
                  Live Platform Management
                </span>
              </h1>
              <p className="text-sm text-slate-400">
                Global overview of all registered users, multi-tenant resource utilization, cold email volumes, and LinkedIn automation.
              </p>
            </div>
          </div>
        </div>

        {/* Admin Controls */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-400">Admin:</span>
            <strong className="text-white font-mono text-[11px]">{currentUserEmail}</strong>
          </div>

          <button
            onClick={fetchAdminData}
            disabled={isRefreshing}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            Refresh Data
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Card 1: Total Users */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Total Users</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white">{stats.totalRegisteredUsers}</div>
            <p className="text-[11px] text-slate-500">Registered Supabase accounts</p>
          </div>

          {/* Card 2: Leads Ingested */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Total Leads</span>
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-white">{stats.totalLeads.toLocaleString()}</div>
            <p className="text-[11px] text-slate-500">From uploaded spreadsheets</p>
          </div>

          {/* Card 3: Sent Outreach Emails */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Emails Sent</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                <Send className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-400">{stats.totalEmailsSent.toLocaleString()}</div>
            <p className="text-[11px] text-slate-500">
              {stats.totalDraftsCreated.toLocaleString()} drafts generated
            </p>
          </div>

          {/* Card 4: LinkedIn Posts */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">LinkedIn Published</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                <Linkedin className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-indigo-300">{stats.totalLinkedInPostsPublished}</div>
            <p className="text-[11px] text-slate-500">
              {stats.totalLinkedInPostsDrafted} posts created
            </p>
          </div>

          {/* Card 5: Platform Token Spend */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Total Spend</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-300">₹{stats.totalSpendINR.toFixed(2)}</div>
            <p className="text-[11px] text-slate-500">
              {(stats.totalTokensUsed / 1000).toFixed(1)}k AI tokens processed
            </p>
          </div>
        </div>
      )}

      {/* System Infrastructure Health Bar */}
      {systemHealth && (
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-300">
            <Server className="w-4 h-4 text-cyan-400" />
            Infrastructure Status:
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Supabase Postgres RLS: <strong className="text-white">Active</strong>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Gemini Flash Pool: <strong className="text-white">3 Keys Loaded</strong>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Groq Failover: <strong className="text-white">Ready</strong>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              LinkedIn REST API: <strong className="text-white">v202608</strong>
            </div>
          </div>
        </div>
      )}

      {/* Users Management Section */}
      <section className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              Registered User Directory & Resource Usage
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-cyan-300 text-xs font-mono font-bold">
                {filteredUsers.length} Users
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Detailed tracking of which user is using which services (Leads, Resumes, Cold Outreach, LinkedIn Studio, API Tokens).
            </p>
          </div>

          {/* Search & Sort Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search user email or UUID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="leads">Sort: Most Leads</option>
              <option value="sent">Sort: Most Emails Sent</option>
              <option value="linkedin">Sort: Most LinkedIn Posts</option>
              <option value="spend">Sort: Highest Spend (₹)</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300 border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-3.5">User Identity</th>
                <th className="p-3.5">Joined Date</th>
                <th className="p-3.5 text-center">Leads</th>
                <th className="p-3.5 text-center">Resumes</th>
                <th className="p-3.5 text-center">Emails Sent</th>
                <th className="p-3.5 text-center">LinkedIn</th>
                <th className="p-3.5 text-right">Spend (₹)</th>
                <th className="p-3.5 text-center">Active Keys</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500 text-xs">
                    No users matching "{searchQuery}" found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* User Column */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          u.isAdmin ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {u.email[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-white truncate max-w-[180px]" title={u.email}>
                              {u.email}
                            </span>
                            {u.isAdmin && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-bold">
                                ADMIN
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 truncate max-w-[180px]" title={u.id}>
                            {u.candidateName ? `${u.candidateName} • ` : ''}{u.id.substring(0, 13)}...
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Joined Date */}
                    <td className="p-3.5 text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    {/* Leads Count */}
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-cyan-300 font-mono font-bold">
                        {u.leadsCount}
                      </span>
                    </td>

                    {/* Resumes */}
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono font-bold">
                        {u.resumesCount}
                      </span>
                    </td>

                    {/* Emails Sent */}
                    <td className="p-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-md font-mono font-bold ${
                        u.sentCount > 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {u.sentCount}
                      </span>
                    </td>

                    {/* LinkedIn Posts */}
                    <td className="p-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-md font-mono font-bold ${
                        u.linkedinPostedCount > 0 ? 'bg-indigo-950 text-indigo-300 border border-indigo-800/60' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {u.linkedinPostedCount} / {u.linkedinDraftsCount}
                      </span>
                    </td>

                    {/* Spend INR */}
                    <td className="p-3.5 text-right font-mono font-bold text-amber-300">
                      ₹{u.spendINR.toFixed(2)}
                    </td>

                    {/* Configured Keys / Integrations */}
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span
                          title={u.integrations.hasGemini ? 'Gemini Key Configured' : 'No Gemini Key'}
                          className={`w-2 h-2 rounded-full ${u.integrations.hasGemini ? 'bg-blue-400' : 'bg-slate-700'}`}
                        />
                        <span
                          title={u.integrations.hasGroq ? 'Groq Key Configured' : 'No Groq Key'}
                          className={`w-2 h-2 rounded-full ${u.integrations.hasGroq ? 'bg-orange-400' : 'bg-slate-700'}`}
                        />
                        <span
                          title={u.integrations.hasSmtp ? 'SMTP Configured' : 'No SMTP'}
                          className={`w-2 h-2 rounded-full ${u.integrations.hasSmtp ? 'bg-emerald-400' : 'bg-slate-700'}`}
                        />
                        <span
                          title={u.integrations.hasBrevo ? 'Brevo Key Configured' : 'No Brevo Key'}
                          className={`w-2 h-2 rounded-full ${u.integrations.hasBrevo ? 'bg-teal-400' : 'bg-slate-700'}`}
                        />
                        <span
                          title={u.integrations.hasLinkedIn ? 'LinkedIn Connected' : 'No LinkedIn Token'}
                          className={`w-2 h-2 rounded-full ${u.integrations.hasLinkedIn ? 'bg-indigo-400' : 'bg-slate-700'}`}
                        />
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-semibold transition-colors flex items-center gap-1.5 ml-auto"
                      >
                        <Eye className="w-3 h-3" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal: User Inspection Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-white">{selectedUser.email}</h3>
                  {selectedUser.isAdmin && (
                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                      ADMIN
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">UUID: {selectedUser.id}</p>
                <p className="text-xs text-slate-500 mt-1">
                  Registered: {new Date(selectedUser.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Leads</span>
                <span className="text-lg font-black text-cyan-400">{selectedUser.leadsCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Sent Emails</span>
                <span className="text-lg font-black text-emerald-400">{selectedUser.sentCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">LinkedIn Posts</span>
                <span className="text-lg font-black text-indigo-400">
                  {selectedUser.linkedinPostedCount} / {selectedUser.linkedinDraftsCount}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Token Spend</span>
                <span className="text-lg font-black text-amber-300">₹{selectedUser.spendINR.toFixed(2)}</span>
              </div>
            </div>

            {/* Configured Services Checklist */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                User Configured Credentials & Services
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { label: 'Google Gemini Key', active: selectedUser.integrations.hasGemini },
                  { label: 'Groq Cloud Key', active: selectedUser.integrations.hasGroq },
                  { label: 'Anthropic Claude', active: selectedUser.integrations.hasAnthropic },
                  { label: 'Custom SMTP Server', active: selectedUser.integrations.hasSmtp },
                  { label: 'Brevo API Delivery', active: selectedUser.integrations.hasBrevo },
                  { label: 'LinkedIn OAuth Token', active: selectedUser.integrations.hasLinkedIn },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                      item.active
                        ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-500'
                    }`}
                  >
                    {item.active ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    )}
                    <span className="truncate text-[11px] font-semibold">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Leads Activity */}
            {selectedUser.recentLeads.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Recent Ingested Leads
                </h4>
                <div className="space-y-1.5">
                  {selectedUser.recentLeads.map((l) => (
                    <div
                      key={l.id}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-white">{l.company || 'Unknown Company'}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(l.imported_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent LinkedIn Activity */}
            {selectedUser.recentPosts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Recent LinkedIn Posts
                </h4>
                <div className="space-y-1.5">
                  {selectedUser.recentPosts.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-white truncate max-w-[280px]">{p.topic}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.status === 'posted'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {p.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={() => setSelectedUser(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
            >
              Close Inspection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
