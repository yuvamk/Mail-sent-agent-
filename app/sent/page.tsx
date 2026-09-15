'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Mail,
  Calendar,
  Loader2,
  Eye,
  Building,
  Radio,
  ExternalLink,
  ShieldAlert,
  Inbox,
  XCircle,
  HelpCircle,
  Search,
  Filter,
  Check,
  X,
} from 'lucide-react';

interface SentRecord {
  id: string;
  lead_id: string;
  ai_provider: string;
  subject: string;
  body: string;
  status: string; // sent | delivered | opened | bounced | replied | failed
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
  leads: {
    id: string;
    company: string;
    email: string | null;
    key_skills: string | null;
    raw_data?: Record<string, any> | null;
  };
}

export default function SentHistoryPage() {
  const router = useRouter();
  const [records, setRecords] = useState<SentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModalRecord, setActiveModalRecord] = useState<SentRecord | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Active Filter & Search State
  const [statusFilter, setStatusFilter] = useState<'all' | 'delivered' | 'opened' | 'replied' | 'bounced' | 'failed'>('all');
  const [search, setSearch] = useState('');

  // Brevo Sync States
  const [syncingBrevo, setSyncingBrevo] = useState(false);
  const [brevoSyncMsg, setBrevoSyncMsg] = useState<{ type: 'success' | 'error' | 'warning'; text: string; authUrl?: string; detectedIp?: string } | null>(null);
  const [ipModalOpen, setIpModalOpen] = useState(false);

  const fetchHistory = async () => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const res = await fetch(`/api/drafts?userId=${session.user.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const allDrafts: SentRecord[] = data.drafts || [];
        // Filter all outreach lifecycle records
        const historyList = allDrafts.filter((d) =>
          ['sent', 'delivered', 'opened', 'bounced', 'failed', 'replied'].includes(d.status)
        );
        setRecords(historyList);
      }
    } catch (e) {
      console.error('Failed to fetch history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [router]);

  const handleSyncBrevo = async () => {
    setSyncingBrevo(true);
    setBrevoSyncMsg(null);
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      const res = await fetch('/api/brevo/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ userId: session?.user?.id }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setBrevoSyncMsg({
          type: 'success',
          text: `Brevo Sync Complete: ${data.deliveredCount || 0} Delivered, ${data.openedCount || 0} Opened, ${data.bouncedCount || 0} Bounced from ${data.totalEventsProcessed || 0} total Brevo events.`,
        });
        await fetchHistory();
      } else if (data.ipAuthRequired) {
        setBrevoSyncMsg({
          type: 'warning',
          text: `Brevo IP Authorization Required for IP: ${data.detectedIp || 'your current IP'}. Please authorize this IP in your Brevo account to allow sync.`,
          authUrl: data.authUrl || 'https://app.brevo.com/security/authorised_ips',
          detectedIp: data.detectedIp,
        });
        setIpModalOpen(true);
      } else {
        setBrevoSyncMsg({
          type: 'error',
          text: data.error || 'Failed to sync with Brevo.',
        });
      }
    } catch (e: any) {
      setBrevoSyncMsg({ type: 'error', text: e?.message || 'Network error during Brevo sync' });
    } finally {
      setSyncingBrevo(false);
    }
  };

  const handleRetrySend = async (record: SentRecord) => {
    setRetryingId(record.id);
    try {
      const res = await fetch('/api/drafts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId: record.id,
          subject: record.subject,
          body: record.body,
        }),
      });

      if (res.ok) {
        fetchHistory();
      }
    } catch (e) {
      console.error('Retry send failed:', e);
    } finally {
      setRetryingId(null);
    }
  };

  // Metrics Calculation
  const totalOutreach = records.length;
  const openedCount = records.filter((r) => r.status === 'opened').length;
  const repliedCount = records.filter((r) => r.status === 'replied').length;
  const deliveredCount = records.filter((r) => r.status === 'delivered' || r.status === 'opened' || r.status === 'replied').length;
  const bouncedCount = records.filter((r) => r.status === 'bounced').length;
  const failedCount = records.filter((r) => r.status === 'failed').length;

  const openRate = deliveredCount > 0 ? Math.round((openedCount / deliveredCount) * 100) : 0;
  const replyRate = deliveredCount > 0 ? Math.round((repliedCount / deliveredCount) * 100) : 0;

  // Toggle Card Filter
  const toggleStatusFilter = (target: 'all' | 'delivered' | 'opened' | 'replied' | 'bounced' | 'failed') => {
    if (statusFilter === target) {
      setStatusFilter('all');
    } else {
      setStatusFilter(target);
    }
  };

  // Filtered Records based on Clickable Card Status Filter + Global Search
  const filteredRecords = React.useMemo(() => {
    return records.filter((r) => {
      // 1. Status Filter
      if (statusFilter === 'delivered') {
        if (!['delivered', 'opened', 'replied'].includes(r.status)) return false;
      } else if (statusFilter === 'opened') {
        if (r.status !== 'opened') return false;
      } else if (statusFilter === 'replied') {
        if (r.status !== 'replied') return false;
      } else if (statusFilter === 'bounced') {
        if (r.status !== 'bounced') return false;
      } else if (statusFilter === 'failed') {
        if (r.status !== 'failed') return false;
      }

      // 2. Global Search
      const q = search.toLowerCase().trim();
      if (!q) return true;

      const dateStr = r.sent_at ? new Date(r.sent_at).toLocaleDateString() : '';
      const fields = [
        r.leads?.company,
        r.leads?.email,
        r.leads?.key_skills,
        r.subject,
        r.body,
        r.ai_provider,
        r.status,
        r.error_message,
        dateStr,
      ];

      return fields.some((val) => val && String(val).toLowerCase().includes(q));
    });
  }, [records, statusFilter, search]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header with Brevo Sync button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Send className="w-7 h-7 text-emerald-600" /> Sent Outreach & Delivery Tracking
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time delivery verification, bounce diagnostics, and recruiter open tracking via Brevo & SMTP.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchHistory}
            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 border border-slate-200 shadow-sm transition-all"
            title="Refresh Table"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            Refresh
          </button>

          <button
            onClick={handleSyncBrevo}
            disabled={syncingBrevo}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
          >
            {syncingBrevo ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Syncing Brevo...
              </>
            ) : (
              <>
                <Radio className="w-4 h-4 text-emerald-200 animate-pulse" />
                Sync Brevo Status
              </>
            )}
          </button>
        </div>
      </div>

      {/* Brevo Sync Notification Banner */}
      {brevoSyncMsg && (
        <div
          className={`p-4 rounded-2xl border flex items-start justify-between gap-3 text-xs shadow-sm ${
            brevoSyncMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : brevoSyncMsg.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-start gap-2">
            {brevoSyncMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            )}
            <div>
              <p className="font-semibold">{brevoSyncMsg.text}</p>
              {brevoSyncMsg.authUrl && (
                <div className="mt-2 flex items-center gap-3">
                  <a
                    href={brevoSyncMsg.authUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-black font-bold text-[11px] hover:bg-amber-400 transition-colors shadow-sm"
                  >
                    Authorize IP ({brevoSyncMsg.detectedIp}) in Brevo <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={handleSyncBrevo}
                    className="underline text-[11px] text-amber-800 hover:text-amber-950 font-medium"
                  >
                    I have authorized it, Retry Sync
                  </button>
                </div>
              )}
            </div>
          </div>
          <button onClick={() => setBrevoSyncMsg(null)} className="text-slate-400 hover:text-slate-700 text-sm">
            ✕
          </button>
        </div>
      )}

      {/* Interactive Clickable KPI Stats Bar */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
          Click any card below to filter sent outreach:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Sent Card */}
          <button
            onClick={() => toggleStatusFilter('all')}
            className={`p-4 rounded-2xl text-left border shadow-xs flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] ${
              statusFilter === 'all'
                ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-semibold text-slate-500">Total Sent</span>
              {statusFilter === 'all' && (
                <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-md">
                  ALL
                </span>
              )}
            </div>
            <span className="text-xl font-bold text-slate-900 mt-2">{totalOutreach}</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Show all sent emails</span>
          </button>

          {/* Delivered Card */}
          <button
            onClick={() => toggleStatusFilter('delivered')}
            className={`p-4 rounded-2xl text-left border shadow-xs flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] ${
              statusFilter === 'delivered'
                ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                : 'bg-white border-emerald-200/80 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-emerald-700 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Delivered
              </span>
              {statusFilter === 'delivered' && (
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                  ACTIVE
                </span>
              )}
            </div>
            <span className="text-xl font-bold text-emerald-600 mt-2">{deliveredCount}</span>
            <span className="text-[10px] text-emerald-600 mt-0.5">Confirmed Inbox</span>
          </button>

          {/* Opened Card */}
          <button
            onClick={() => toggleStatusFilter('opened')}
            className={`p-4 rounded-2xl text-left border shadow-xs flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] ${
              statusFilter === 'opened'
                ? 'bg-purple-50/70 border-purple-500 ring-2 ring-purple-500/20 shadow-md'
                : 'bg-white border-purple-200/80 hover:border-purple-300'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-purple-700 flex items-center gap-1 font-semibold">
                <Eye className="w-3.5 h-3.5" /> Opened
              </span>
              {statusFilter === 'opened' && (
                <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-md">
                  ACTIVE
                </span>
              )}
            </div>
            <span className="text-xl font-bold text-purple-600 mt-2">{openedCount}</span>
            <span className="text-[10px] text-purple-600 mt-0.5">{openRate}% open rate</span>
          </button>

          {/* Replied Card */}
          <button
            onClick={() => toggleStatusFilter('replied')}
            className={`p-4 rounded-2xl text-left border shadow-xs flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] ${
              statusFilter === 'replied'
                ? 'bg-cyan-50/70 border-cyan-500 ring-2 ring-cyan-500/20 shadow-md'
                : 'bg-white border-cyan-200/80 hover:border-cyan-300'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-cyan-700 flex items-center gap-1 font-semibold">
                <Mail className="w-3.5 h-3.5" /> Replied
              </span>
              {statusFilter === 'replied' && (
                <span className="text-[9px] font-bold text-cyan-700 bg-cyan-100 px-1.5 py-0.5 rounded-md">
                  ACTIVE
                </span>
              )}
            </div>
            <span className="text-xl font-bold text-cyan-600 mt-2">{repliedCount}</span>
            <span className="text-[10px] text-cyan-600 mt-0.5">{replyRate}% response rate</span>
          </button>

          {/* Bounced Card */}
          <button
            onClick={() => toggleStatusFilter('bounced')}
            className={`p-4 rounded-2xl text-left border shadow-xs flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] ${
              statusFilter === 'bounced'
                ? 'bg-rose-50/70 border-rose-500 ring-2 ring-rose-500/20 shadow-md'
                : 'bg-white border-rose-200/80 hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-rose-700 flex items-center gap-1 font-semibold">
                <XCircle className="w-3.5 h-3.5" /> Bounced
              </span>
              {statusFilter === 'bounced' && (
                <span className="text-[9px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-md">
                  ACTIVE
                </span>
              )}
            </div>
            <span className="text-xl font-bold text-rose-600 mt-2">{bouncedCount}</span>
            <span className="text-[10px] text-rose-600 mt-0.5">Invalid Recipient</span>
          </button>

          {/* Failed Card */}
          <button
            onClick={() => toggleStatusFilter('failed')}
            className={`p-4 rounded-2xl text-left border shadow-xs flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] ${
              statusFilter === 'failed'
                ? 'bg-red-50/70 border-red-500 ring-2 ring-red-500/20 shadow-md'
                : 'bg-white border-slate-200 hover:border-red-300'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-slate-500 flex items-center gap-1 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Failed
              </span>
              {statusFilter === 'failed' && (
                <span className="text-[9px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-md">
                  ACTIVE
                </span>
              )}
            </div>
            <span className="text-xl font-bold text-red-600 mt-2">{failedCount}</span>
            <span className="text-[10px] text-slate-400 mt-0.5">SMTP Errors</span>
          </button>
        </div>
      </div>

      {/* Global Search and Filter Summary Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
        {/* Search Input */}
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search email, company, subject, error..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Summary & Quick Reset */}
        <div className="flex items-center gap-2 text-xs w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Filter className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              Showing <strong>{filteredRecords.length}</strong> of {records.length} emails
            </span>
          </div>

          {(statusFilter !== 'all' || search) && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setSearch('');
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" /> Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-4 w-12 text-center text-slate-400 font-mono">#</th>
                <th className="p-4">Recipient & Company</th>
                <th className="p-4">Subject Line</th>
                <th className="p-4">Delivery Status</th>
                <th className="p-4">Sent Timestamp</th>
                <th className="p-4 text-center">Telemetry</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
                    Loading delivery audit history...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <p className="font-semibold text-slate-700 mb-1">No sent outreach records found</p>
                    <p className="text-xs text-slate-400 mb-3">
                      {search || statusFilter !== 'all'
                        ? 'No records match your active search or status filter.'
                        : 'Approved emails will appear here with live delivery status.'}
                    </p>
                    {(search || statusFilter !== 'all') && (
                      <button
                        onClick={() => {
                          setStatusFilter('all');
                          setSearch('');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                      >
                        Reset Search & Filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, index) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 text-center font-mono text-slate-400 text-xs font-semibold">
                      #{index + 1}
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-900 text-sm">{r.leads?.company || 'Company'}</p>
                      <p className="text-[11px] text-emerald-600 font-mono flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {r.leads?.email || 'N/A'}
                      </p>
                    </td>

                    <td className="p-4 max-w-xs">
                      <p className="truncate text-slate-800 font-medium" title={r.subject}>
                        {r.subject}
                      </p>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">{r.ai_provider}</span>
                    </td>

                    <td className="p-4">
                      {r.status === 'replied' ? (
                        <span className="px-2.5 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 text-[10px] font-bold flex items-center gap-1.5 w-max">
                          <Mail className="w-3.5 h-3.5 text-cyan-600" /> Replied by Recruiter
                        </span>
                      ) : r.status === 'opened' ? (
                        <span className="px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold flex items-center gap-1.5 w-max">
                          <Eye className="w-3.5 h-3.5 text-purple-600 animate-pulse" /> Opened / Viewed
                        </span>
                      ) : r.status === 'delivered' ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold flex items-center gap-1.5 w-max">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Delivered (Brevo)
                        </span>
                      ) : r.status === 'bounced' ? (
                        <span
                          className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold flex items-center gap-1.5 w-max cursor-help"
                          title={r.error_message || 'Recipient email bounced'}
                        >
                          <XCircle className="w-3.5 h-3.5 text-rose-600" /> Bounced
                        </span>
                      ) : r.status === 'sent' ? (
                        <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold flex items-center gap-1.5 w-max">
                          <Send className="w-3.5 h-3.5 text-blue-600" /> Sent (In Transit)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold flex items-center gap-1.5 w-max">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Failed
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-slate-500 font-mono text-[11px]">
                      {r.sent_at ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {new Date(r.sent_at).toLocaleDateString()}
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </td>

                    <td className="p-4 text-center">
                      {r.status === 'bounced' && r.error_message ? (
                        <span className="text-[10px] text-rose-600 font-mono truncate max-w-[150px] inline-block" title={r.error_message}>
                          {r.error_message}
                        </span>
                      ) : r.status === 'opened' ? (
                        <span className="text-[10px] text-purple-700 font-mono">
                          Read by HR
                        </span>
                      ) : r.status === 'delivered' ? (
                        <span className="text-[10px] text-emerald-700 font-mono">
                          Server 250 OK
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">-</span>
                      )}
                    </td>

                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setActiveModalRecord(r)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shadow-sm"
                          title="View Sent Payload"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {r.status === 'failed' && (
                          <button
                            onClick={() => handleRetrySend(r)}
                            disabled={retryingId === r.id}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors disabled:opacity-50"
                            title="Retry Manual Dispatch"
                          >
                            <RefreshCw className={`w-4 h-4 ${retryingId === r.id ? 'animate-spin' : ''}`} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Brevo IP Authorization Modal */}
      {ipModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-600 border-b border-slate-100 pb-3">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-base font-bold text-slate-900">Brevo IP Authorization Required</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Brevo has an IP security safeguard enabled on your account. Because your connection is originating from IP{' '}
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-mono font-bold">
                {brevoSyncMsg?.detectedIp || '103.217.132.247'}
              </span>
              , Brevo requires you to whitelist this IP address before allowing API access.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
              <p className="font-semibold text-slate-900">How to fix in 30 seconds:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-700">
                <li>Click the button below to open Brevo Authorized IPs page.</li>
                <li>Add IP <code className="text-emerald-700 font-bold">{brevoSyncMsg?.detectedIp || '103.217.132.247'}</code> or click &ldquo;Authorize current IP&rdquo;.</li>
                <li>Click &ldquo;Confirm &amp; Retry Sync&rdquo; below!</li>
              </ol>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIpModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Close
              </button>
              <a
                href={brevoSyncMsg?.authUrl || 'https://app.brevo.com/security/authorised_ips'}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                Open Brevo Security Page <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => {
                  setIpModalOpen(false);
                  handleSyncBrevo();
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm"
              >
                Retry Sync Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal View Sent Payload & Telemetry */}
      {activeModalRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-xl w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">{activeModalRecord.leads?.company}</h3>
              </div>
              <button onClick={() => setActiveModalRecord(null)} className="text-slate-400 hover:text-slate-700 text-sm">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500">Recipient Email: </span>
                <span className="text-emerald-600 font-mono font-semibold">{activeModalRecord.leads?.email}</span>
              </div>

              <div>
                <span className="text-slate-500">Delivery Status: </span>
                <span className="font-bold uppercase font-mono text-indigo-700">{activeModalRecord.status}</span>
              </div>

              {activeModalRecord.error_message && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                  <span className="font-bold">Error / Bounce Diagnostic: </span>
                  <p className="mt-1 font-mono text-[11px]">{activeModalRecord.error_message}</p>
                </div>
              )}

              {activeModalRecord.leads?.raw_data?.reply && (
                <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-800">
                  <span className="font-bold">Recruiter Reply: </span>
                  <p className="mt-1 italic">&ldquo;{activeModalRecord.leads.raw_data.reply.snippet}&rdquo;</p>
                </div>
              )}

              <div>
                <span className="text-slate-500">Subject: </span>
                <p className="text-slate-900 font-medium mt-0.5">{activeModalRecord.subject}</p>
              </div>

              <div>
                <span className="text-slate-500">Email Body: </span>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 whitespace-pre-wrap font-mono text-[11px] max-h-60 overflow-y-auto mt-1">
                  {activeModalRecord.body}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveModalRecord(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
