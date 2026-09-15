'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import {
  Users,
  Search,
  Filter,
  CheckSquare,
  Square,
  Sparkles,
  Bot,
  Mail,
  ExternalLink,
  ChevronRight,
  Loader2,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Zap,
  Briefcase,
  AlertTriangle,
  RefreshCw,
  Coins,
  ShieldCheck,
  Check,
  MessageSquare,
  ArrowRight,
  Info,
  Eye,
  XCircle,
  Calendar,
  X,
} from 'lucide-react';

interface Lead {
  id: string;
  company: string;
  location: string | null;
  salary: string | null;
  experience: string | null;
  key_skills: string | null;
  email: string | null;
  contact_number: string | null;
  apply_url: string | null;
  has_valid_email: boolean;
  source_file: string | null;
  imported_at: string;
  draftStatus?: string;
  raw_data?: Record<string, any> | null;
}

interface DashboardStats {
  totalLeads: number;
  sentCount: number;
  repliedCount: number;
  draftedCount: number;
  failedCount: number;
  totalCostINR: number;
  totalTokens: number;
}

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unsent' | 'drafted' | 'sent' | 'replied' | 'valid' | 'url'>('all');
  const [expFilter, setExpFilter] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('latest'); // 'latest' | 'all' | 'YYYY-MM-DD'
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  // Top Dashboard Aggregate Stats
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    sentCount: 0,
    repliedCount: 0,
    draftedCount: 0,
    failedCount: 0,
    totalCostINR: 0,
    totalTokens: 0,
  });

  // AI Provider & Model Selection
  const [aiProvider, setAiProvider] = useState<'groq' | 'claude' | 'gemini' | 'both'>('groq');
  const [groqModel, setGroqModel] = useState<string>('groq/compound');
  const [generating, setGenerating] = useState(false);

  // Live Generation Progress State
  const [progressState, setProgressState] = useState<{
    inProgress: boolean;
    currentLeadName: string;
    currentLeadEmail: string;
    completedCount: number;
    totalToProcess: number;
    skippedCount: number;
    errorCount: number;
    percent: number;
    activityLogs: Array<{ text: string; type: 'success' | 'skip' | 'error'; timestamp: string }>;
    isFinished: boolean;
  }>({
    inProgress: false,
    currentLeadName: '',
    currentLeadEmail: '',
    completedCount: 0,
    totalToProcess: 0,
    skippedCount: 0,
    errorCount: 0,
    percent: 0,
    activityLogs: [],
    isFinished: false,
  });

  // Reply Sync State
  const [syncingReplies, setSyncingReplies] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [imapModalOpen, setImapModalOpen] = useState(false);

  const fetchLeads = async () => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const res = await fetch(`/api/leads?userId=${session.user.id}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads || []);
        if (data.stats) {
          setStats(data.stats);
        }
        setFetchError(null);
      } else {
        const errData = await res.json().catch(() => ({}));
        setFetchError(errData.error || 'Failed to load leads from database');
      }
    } catch (e: any) {
      console.error('Failed to fetch leads:', e);
      setFetchError(e?.message || 'Network error fetching leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();

    const { data: authListener } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchLeads();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 1. Helper to extract clean YYYY-MM-DD upload date
  const getLeadDateKey = (lead: Lead): string => {
    const raw = lead.imported_at || (lead as any).created_at;
    if (!raw) return 'Unknown';
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) return 'Unknown';
      return d.toISOString().split('T')[0];
    } catch {
      return 'Unknown';
    }
  };

  // 2. Build list of distinct Excel upload batches with metadata & counts
  const uploadBatches = React.useMemo(() => {
    const dateMap = new Map<
      string,
      { date: string; count: number; filenames: Set<string>; latestTimestamp: number }
    >();

    leads.forEach((l) => {
      const key = getLeadDateKey(l);
      if (key === 'Unknown') return;
      const ts = new Date(l.imported_at || (l as any).created_at).getTime() || 0;
      if (!dateMap.has(key)) {
        dateMap.set(key, { date: key, count: 0, filenames: new Set<string>(), latestTimestamp: ts });
      }
      const entry = dateMap.get(key)!;
      entry.count++;
      if (l.source_file) entry.filenames.add(l.source_file);
      if (ts > entry.latestTimestamp) entry.latestTimestamp = ts;
    });

    return Array.from(dateMap.values()).sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  }, [leads]);

  // The latest upload date key
  const latestDateKey = uploadBatches.length > 0 ? uploadBatches[0].date : null;

  // 3. Date-Scoped Leads: filter by chosen Excel upload batch
  const dateScopedLeads = React.useMemo(() => {
    if (selectedDateFilter === 'all' || !latestDateKey) {
      return leads;
    }
    const targetDate = selectedDateFilter === 'latest' ? latestDateKey : selectedDateFilter;
    return leads.filter((l) => getLeadDateKey(l) === targetDate);
  }, [leads, selectedDateFilter, latestDateKey]);

  // 4. Dynamic, 100% accurate tab counts computed from dateScopedLeads
  const dynamicCounts = React.useMemo(() => {
    let unsent = 0;
    let drafted = 0;
    let sent = 0;
    let replied = 0;
    let validEmail = 0;
    let urlOnly = 0;

    dateScopedLeads.forEach((l) => {
      const s = l.draftStatus;
      if (l.has_valid_email) validEmail++;
      else urlOnly++;

      if (s === 'replied') {
        replied++;
      } else if (s === 'sent' || s === 'delivered' || s === 'opened') {
        sent++;
      } else if (s === 'drafted' || s === 'reviewed' || s === 'approved') {
        drafted++;
      } else if (l.has_valid_email) {
        unsent++;
      }
    });

    return {
      all: dateScopedLeads.length,
      unsent,
      drafted,
      sent,
      replied,
      validEmail,
      urlOnly,
    };
  }, [dateScopedLeads]);

  // 5. Filter leads based on global search, filter tabs, and experience
  const filteredLeads = React.useMemo(() => {
    return dateScopedLeads.filter((l) => {
      // Tab filters
      if (filterType === 'unsent') {
        if (!l.has_valid_email || ['sent', 'delivered', 'opened', 'replied'].includes(l.draftStatus || '')) return false;
      } else if (filterType === 'drafted') {
        if (!['drafted', 'reviewed', 'approved'].includes(l.draftStatus || '')) return false;
      } else if (filterType === 'sent') {
        if (!['sent', 'delivered', 'opened'].includes(l.draftStatus || '')) return false;
      } else if (filterType === 'replied') {
        if (l.draftStatus !== 'replied') return false;
      } else if (filterType === 'valid') {
        if (!l.has_valid_email) return false;
      } else if (filterType === 'url') {
        if (l.has_valid_email) return false;
      }

      // Experience Filter
      if (expFilter !== 'all') {
        const expText = (l.experience || '').toLowerCase();
        if (expFilter === '0-1' && !expText.includes('0') && !expText.includes('1')) return false;
        if (expFilter === '1-3' && !expText.includes('1') && !expText.includes('2') && !expText.includes('3')) return false;
        if (expFilter === '3-5' && !expText.includes('3') && !expText.includes('4') && !expText.includes('5')) return false;
        if (expFilter === '5+' && !expText.includes('5') && !expText.includes('6') && !expText.includes('7') && !expText.includes('8') && !expText.includes('10')) return false;
      }

      // Global multi-field search across company, skills, email, location, experience, salary, contact, filename, status & raw_data
      const query = search.toLowerCase().trim();
      if (!query) return true;

      const rawStrings = l.raw_data ? Object.values(l.raw_data).map((v) => String(v || '')) : [];

      return [
        l.company,
        l.key_skills,
        l.email,
        l.location,
        l.experience,
        l.salary,
        l.contact_number,
        l.source_file,
        l.draftStatus,
        ...rawStrings,
      ].some((val) => val && String(val).toLowerCase().includes(query));
    });
  }, [dateScopedLeads, filterType, expFilter, search]);

  // Eligible leads for AI drafting: has valid email AND NOT already sent or replied!
  const eligibleUnsentLeadIds = filteredLeads
    .filter((l) => l.has_valid_email && l.draftStatus !== 'sent' && l.draftStatus !== 'replied')
    .map((l) => l.id);

  // Smart Select All: selects all eligible UN-SENT leads by default to protect sent leads
  const toggleSelectAll = () => {
    if (selectedIds.length === eligibleUnsentLeadIds.length && eligibleUnsentLeadIds.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(eligibleUnsentLeadIds);
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Sync replies from Gmail via IMAP
  const handleSyncReplies = async () => {
    setSyncingReplies(true);
    setSyncFeedback(null);
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      const res = await fetch('/api/replies/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ action: 'sync', userId: session?.user?.id }),
      });

      const data = await res.json();
      if (data.requiresAuth) {
        setImapModalOpen(true);
      } else if (data.success) {
        setSyncFeedback({
          type: 'success',
          message: data.message || `Sync finished: ${data.repliesFound} recruiter replies detected!`,
        });
        fetchLeads();
      } else {
        setSyncFeedback({
          type: 'error',
          message: data.message || data.error || 'Failed to sync replies from email.',
        });
      }
    } catch (e: any) {
      setSyncFeedback({ type: 'error', message: e?.message || 'Error syncing replies' });
    } finally {
      setSyncingReplies(false);
    }
  };

  // Real-time AI Generation loop with Live Progress Bar
  const handleStartGeneration = async () => {
    const selectedLeadsObjects = leads.filter((l) => selectedIds.includes(l.id));
    // Exclude leads whose emails were already sent or replied
    const eligibleLeads = selectedLeadsObjects.filter(
      (l) => l.email && l.draftStatus !== 'sent' && l.draftStatus !== 'replied'
    );
    const alreadySentCount = selectedLeadsObjects.length - eligibleLeads.length;

    if (eligibleLeads.length === 0) {
      alert('All selected leads have already received outreach emails and are protected from duplicate re-drafting.');
      return;
    }

    setGenerating(true);
    const initialLogs: Array<{ text: string; type: 'success' | 'skip' | 'error'; timestamp: string }> = [];
    if (alreadySentCount > 0) {
      initialLogs.push({
        text: `Protected & skipped ${alreadySentCount} lead(s) because outreach email was already sent.`,
        type: 'skip',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });
    }

    setProgressState({
      inProgress: true,
      currentLeadName: eligibleLeads[0].company,
      currentLeadEmail: eligibleLeads[0].email || '',
      completedCount: 0,
      totalToProcess: eligibleLeads.length,
      skippedCount: alreadySentCount,
      errorCount: 0,
      percent: 0,
      activityLogs: initialLogs,
      isFinished: false,
    });

    const { data: { session } } = await supabaseBrowser.auth.getSession();
    let completed = 0;
    let errors = 0;
    const logs = [...initialLogs];

    // Process leads sequentially with real-time UI updates
    for (let i = 0; i < eligibleLeads.length; i++) {
      const currentLead = eligibleLeads[i];
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      setProgressState((prev) => ({
        ...prev,
        currentLeadName: currentLead.company,
        currentLeadEmail: currentLead.email || '',
        percent: Math.round((i / eligibleLeads.length) * 100),
      }));

      try {
        const res = await fetch('/api/drafts/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({
            leadIds: [currentLead.id],
            provider: aiProvider,
            groqModel,
            userId: session?.user?.id,
          }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          if (data.skippedSentCount > 0) {
            logs.unshift({
              text: `${currentLead.company} (${currentLead.email}) — Skipped (already sent)`,
              type: 'skip',
              timestamp: nowStr,
            });
          } else {
            completed++;
            logs.unshift({
              text: `${currentLead.company} (${currentLead.email}) — Draft created via ${aiProvider.toUpperCase()}`,
              type: 'success',
              timestamp: nowStr,
            });
          }
        } else {
          errors++;
          logs.unshift({
            text: `${currentLead.company} — Error: ${data.error || 'Failed'}`,
            type: 'error',
            timestamp: nowStr,
          });
        }
      } catch (err: any) {
        errors++;
        logs.unshift({
          text: `${currentLead.company} — Network error: ${err?.message}`,
          type: 'error',
          timestamp: nowStr,
        });
      }

      const currentPercent = Math.round(((i + 1) / eligibleLeads.length) * 100);
      setProgressState((prev) => ({
        ...prev,
        completedCount: completed,
        errorCount: errors,
        percent: currentPercent,
        activityLogs: [...logs],
      }));
    }

    setProgressState((prev) => ({
      ...prev,
      inProgress: false,
      isFinished: true,
      percent: 100,
      currentLeadName: 'All drafts generated!',
      currentLeadEmail: '',
    }));

    setGenerating(false);
    fetchLeads();
  };

  const selectedCount = selectedIds.length;
  const unsentEligibleCount = leads.filter(
    (l) => l.has_valid_email && l.draftStatus !== 'sent' && l.draftStatus !== 'replied'
  ).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="w-7 h-7 text-blue-600" /> Outreach Dashboard & Lead Manager
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse extracted leads, track sent emails and recruiter replies, and queue AI drafts with live progress.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Check Email Replies Button */}
          <button
            onClick={handleSyncReplies}
            disabled={syncingReplies}
            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm hover:border-cyan-500/50"
            title="Scan your Gmail inbox for replies from recruiters"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-600 ${syncingReplies ? 'animate-spin' : ''}`} />
            {syncingReplies ? 'Checking Inbox...' : 'Check / Sync Replies'}
          </button>

          {/* Queue AI Drafts Button */}
          {selectedCount > 0 && (
            <button
              onClick={() => {
                setProgressState((prev) => ({ ...prev, inProgress: false, isFinished: false, percent: 0, activityLogs: [] }));
                setModalOpen(true);
              }}
              id="btn-open-generate-modal"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all animate-scale-in"
            >
              <Sparkles className="w-4 h-4 text-cyan-200" /> Queue AI Drafts ({selectedCount} Selected)
            </button>
          )}
        </div>
      </div>

      {/* Sync Feedback Toast */}
      {syncFeedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border shadow-sm ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {syncFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{syncFeedback.message}</span>
          </div>
          <button onClick={() => setSyncFeedback(null)} className="text-slate-400 hover:text-slate-700 text-xs ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Error Alert */}
      {fetchError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              fetchLeads();
            }}
            className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Dashboard Top Stats Bar: Total Leads, Sent, Replies, Drafts, and Cost in Rupees */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Leads */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Total Leads</p>
            <p className="text-xl font-bold text-slate-900">{stats.totalLeads}</p>
          </div>
        </div>

        {/* Total Mails Sent */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Mails Sent</p>
            <p className="text-xl font-bold text-emerald-600">{stats.sentCount}</p>
          </div>
        </div>

        {/* Replies Received */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Replies Got</p>
            <p className="text-xl font-bold text-cyan-700">{stats.repliedCount}</p>
          </div>
        </div>

        {/* AI Drafts Ready */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Drafts Ready</p>
            <p className="text-xl font-bold text-indigo-700">{stats.draftedCount}</p>
          </div>
        </div>

        {/* Total AI Token Cost in Rupees */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/50 via-white to-indigo-50/40 border border-amber-200/80 shadow-sm flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">AI Token Cost (₹)</p>
            <p className="text-xl font-bold text-amber-700">₹{stats.totalCostINR.toFixed(2)}</p>
            <p className="text-[10px] text-slate-400">{stats.totalTokens.toLocaleString()} tokens</p>
          </div>
        </div>
      </div>

      {/* Upload Batch Notification Banner */}
      {uploadBatches.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5 text-indigo-950">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold">
                {selectedDateFilter === 'latest' ? (
                  <>
                    Viewing <span className="text-indigo-600">Most Recent Upload</span> ({new Date(latestDateKey!).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })})
                  </>
                ) : selectedDateFilter === 'all' ? (
                  <>
                    Viewing <span className="text-indigo-600">All Excel Batches</span> ({leads.length} total leads)
                  </>
                ) : (
                  <>
                    Viewing Batch from <span className="text-indigo-600">{new Date(selectedDateFilter).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span> ({dateScopedLeads.length} leads)
                  </>
                )}
              </p>
              <p className="text-[11px] text-slate-500">
                {selectedDateFilter === 'latest'
                  ? `Showing the latest ${dateScopedLeads.length} leads imported. Older batches remain safely preserved.`
                  : selectedDateFilter === 'all'
                  ? `Showing full historical leads across ${uploadBatches.length} Excel upload batches.`
                  : `Filtered strictly to leads uploaded on this date.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectedDateFilter !== 'all' ? (
              <button
                onClick={() => setSelectedDateFilter('all')}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-indigo-200 text-indigo-700 font-bold text-xs shadow-xs transition-all hover:border-indigo-300"
              >
                View All Uploads ({leads.length})
              </button>
            ) : latestDateKey ? (
              <button
                onClick={() => setSelectedDateFilter('latest')}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all"
              >
                View Latest Upload &rarr;
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* Filter and Search Hub */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3.5">
        {/* Row 1: Global Search & Dropdown Filters */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search company, skills, exp, email, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-blue-500 placeholder:text-slate-400 transition-colors"
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

          {/* Dropdown Filters & Quick Reset */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Excel Upload Date / Batch Filter */}
            {uploadBatches.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-semibold text-slate-500">Upload Date:</span>
                <select
                  value={selectedDateFilter}
                  onChange={(e) => setSelectedDateFilter(e.target.value)}
                  className="bg-transparent text-slate-900 focus:outline-none cursor-pointer text-xs font-semibold"
                >
                  {latestDateKey && (
                    <option value="latest" className="bg-white text-slate-800 font-semibold">
                      ⚡ Most Recent ({new Date(latestDateKey).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
                    </option>
                  )}
                  <option value="all" className="bg-white text-slate-800">
                    📅 All Dates ({leads.length} leads)
                  </option>
                  {uploadBatches.map((b) => (
                    <option key={b.date} value={b.date} className="bg-white text-slate-800">
                      {new Date(b.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} ({b.count} leads{b.filenames.size > 0 ? ` • ${Array.from(b.filenames)[0]}` : ''})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Experience Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700">
              <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
              <span className="font-semibold text-slate-500">Exp:</span>
              <select
                value={expFilter}
                onChange={(e) => setExpFilter(e.target.value)}
                className="bg-transparent text-slate-900 focus:outline-none cursor-pointer text-xs font-semibold"
              >
                <option value="all" className="bg-white text-slate-800">All Experience</option>
                <option value="0-1" className="bg-white text-slate-800">0 - 1 Years</option>
                <option value="1-3" className="bg-white text-slate-800">1 - 3 Years</option>
                <option value="3-5" className="bg-white text-slate-800">3 - 5 Years</option>
                <option value="5+" className="bg-white text-slate-800">5+ Years</option>
              </select>
            </div>

            {/* Reset Filters button */}
            {(search || selectedDateFilter !== 'latest' || expFilter !== 'all' || filterType !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setFilterType('all');
                  setExpFilter('all');
                  setSelectedDateFilter('latest');
                }}
                className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1 transition-colors"
                title="Reset all search and filters"
              >
                <X className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Status Tabs & Telemetry Counters */}
        <div className="border-t border-slate-100 pt-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="bg-slate-100/90 p-1 rounded-xl border border-slate-200 flex flex-wrap text-xs font-medium gap-1">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterType === 'all' ? 'bg-white text-blue-600 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({dynamicCounts.all})
            </button>
            <button
              onClick={() => setFilterType('unsent')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterType === 'unsent' ? 'bg-white text-indigo-600 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Unsent ({dynamicCounts.unsent})
            </button>
            <button
              onClick={() => setFilterType('drafted')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterType === 'drafted' ? 'bg-white text-violet-600 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Drafts ({dynamicCounts.drafted})
            </button>
            <button
              onClick={() => setFilterType('sent')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterType === 'sent' ? 'bg-white text-emerald-600 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sent ({dynamicCounts.sent})
            </button>
            <button
              onClick={() => setFilterType('replied')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterType === 'replied' ? 'bg-white text-cyan-600 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Replies ({dynamicCounts.replied})
            </button>
            <button
              onClick={() => setFilterType('valid')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filterType === 'valid' ? 'bg-white text-emerald-700 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Valid Email ({dynamicCounts.validEmail})
            </button>
          </div>

          {/* Results Summary & Selection Pill */}
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              Showing <strong className="text-slate-900">{filteredLeads.length}</strong> of {dateScopedLeads.length} leads
            </span>
            {selectedCount > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 font-bold text-[11px]">
                {selectedCount} selected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Leads Table with Serial Numbers (#) */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-4 w-10 text-center">
                  <button
                    onClick={toggleSelectAll}
                    title="Select all un-sent leads (protected sent leads are excluded)"
                    className="text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {selectedIds.length > 0 && selectedIds.length === eligibleUnsentLeadIds.length ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-4 w-12 text-center text-slate-400 font-mono">#</th>
                <th className="p-4">Company</th>
                <th className="p-4">Required Skills</th>
                <th className="p-4">Exp & Salary</th>
                <th className="p-4">Contact / Link</th>
                <th className="p-4 text-center">Outreach Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                    Loading leads database...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <p className="font-semibold text-slate-700 mb-1">No leads matching current filters</p>
                    <p className="text-xs text-slate-400 mb-3">
                      {search ? `No matches found for "${search}".` : 'Try selecting another status tab or Excel upload batch.'}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {search && (
                        <button
                          onClick={() => setSearch('')}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                        >
                          Clear Search
                        </button>
                      )}
                      {selectedDateFilter !== 'all' && (
                        <button
                          onClick={() => setSelectedDateFilter('all')}
                          className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold"
                        >
                          View All Upload Dates ({leads.length})
                        </button>
                      )}
                      {filterType !== 'all' && (
                        <button
                          onClick={() => setFilterType('all')}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                        >
                          Reset Tab Filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead, index) => {
                  const isSelected = selectedIds.includes(lead.id);
                  const isSent = lead.draftStatus === 'sent';
                  const isReplied = lead.draftStatus === 'replied';

                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-4 text-center">
                        {lead.has_valid_email ? (
                          <button
                            onClick={() => toggleSelectOne(lead.id)}
                            className="text-slate-400 hover:text-slate-700"
                            title={isSent ? 'Outreach email already sent (Protected)' : 'Select for AI generation'}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        ) : (
                          <span className="text-slate-300 cursor-not-allowed">–</span>
                        )}
                      </td>

                      {/* Serial Number (#) */}
                      <td className="p-4 text-center font-mono text-slate-400 text-xs font-semibold">
                        #{index + 1}
                      </td>

                      {/* Company & Location */}
                      <td className="p-4">
                        <p className="font-bold text-slate-900 text-sm">{lead.company}</p>
                        <p className="text-[11px] text-slate-500">{lead.location || 'Location unspecified'}</p>
                      </td>

                      {/* Key Skills */}
                      <td className="p-4 max-w-xs">
                        <p className="truncate text-slate-700 font-medium" title={lead.key_skills || ''}>
                          {lead.key_skills || 'N/A'}
                        </p>
                      </td>

                      {/* Experience & Salary */}
                      <td className="p-4">
                        <p className="text-emerald-600 font-semibold">
                          {lead.experience ? `${lead.experience}` : 'Exp N/A'}
                        </p>
                        <p className="text-[11px] text-slate-500">{lead.salary || 'Salary N/A'}</p>
                      </td>

                      {/* Contact / Email / Link */}
                      <td className="p-4">
                        {lead.has_valid_email && lead.email ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 font-mono">
                            <Mail className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate max-w-[200px]" title={lead.email}>
                              {lead.email}
                            </span>
                          </div>
                        ) : lead.apply_url ? (
                          <a
                            href={lead.apply_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-cyan-600 hover:underline font-medium"
                          >
                            Apply Link <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">No Direct Contact</span>
                        )}
                      </td>

                      {/* Outreach Status */}
                      <td className="p-4 text-center">
                        {isReplied ? (
                          <span className="px-2.5 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 text-[10px] font-bold inline-flex items-center gap-1">
                            <MessageSquare className="w-3 h-3 text-cyan-600" /> Replied
                          </span>
                        ) : lead.draftStatus === 'opened' ? (
                          <span className="px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold inline-flex items-center gap-1">
                            <Eye className="w-3 h-3 text-purple-600" /> Opened
                          </span>
                        ) : lead.draftStatus === 'delivered' ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Delivered
                          </span>
                        ) : lead.draftStatus === 'bounced' ? (
                          <span className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-rose-600" /> Bounced
                          </span>
                        ) : isSent ? (
                          <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold inline-flex items-center gap-1">
                            <Send className="w-3 h-3 text-blue-600" /> Sent
                          </span>
                        ) : lead.draftStatus === 'failed' ? (
                          <span className="px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-red-600" /> Failed
                          </span>
                        ) : lead.draftStatus ? (
                          <span className="px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-semibold">
                            {lead.draftStatus}
                          </span>
                        ) : lead.has_valid_email ? (
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[10px]">
                            Not Drafted
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-slate-400 text-[10px]">Portal Link</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real-time AI Generation Modal with Live Progress Bar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-xl w-full space-y-5 shadow-2xl animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <Bot className="w-6 h-6 text-indigo-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Queue Sequential AI Drafts</h3>
                  <p className="text-[11px] text-slate-500">
                    {progressState.inProgress
                      ? 'Generating personalized cold outreach drafts...'
                      : progressState.isFinished
                      ? 'Generation complete!'
                      : 'Configure AI provider and start sequential drafting'}
                  </p>
                </div>
              </div>
              {!progressState.inProgress && (
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 text-sm"
                >
                  ✕
                </button>
              )}
            </div>

            {/* LIVE PROGRESS VIEW (when in progress or finished) */}
            {progressState.inProgress || progressState.isFinished ? (
              <div className="space-y-4">
                {/* Progress Bar Header */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-semibold flex items-center gap-1.5">
                    {progressState.inProgress && <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-600" />}
                    {progressState.isFinished ? '✓ Batch Generation Finished' : 'Processing Outreach Queue'}
                  </span>
                  <span className="font-mono text-cyan-600 font-extrabold text-sm">
                    {progressState.percent}%
                  </span>
                </div>

                {/* Animated Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-3 p-0.5 border border-slate-200 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 h-full rounded-full transition-all duration-300 shadow-sm"
                    style={{ width: `${progressState.percent}%` }}
                  />
                </div>

                {/* Real-time Counters Grid */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] text-slate-500 font-medium">Generated</p>
                    <p className="text-emerald-600 font-bold text-sm">
                      {progressState.completedCount} / {progressState.totalToProcess}
                    </p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] text-slate-500 font-medium">Remaining</p>
                    <p className="text-cyan-700 font-bold text-sm">
                      {Math.max(0, progressState.totalToProcess - progressState.completedCount - progressState.errorCount)}
                    </p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] text-slate-500 font-medium">Sent (Skipped)</p>
                    <p className="text-amber-600 font-bold text-sm">{progressState.skippedCount}</p>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-[10px] text-slate-500 font-medium">Errors</p>
                    <p className="text-red-600 font-bold text-sm">{progressState.errorCount}</p>
                  </div>
                </div>

                {/* Active Lead Pill */}
                {progressState.inProgress && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2.5 text-xs">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0 animate-spin" />
                    <div className="truncate">
                      <p className="font-semibold text-slate-900 truncate">
                        Processing: {progressState.currentLeadName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {progressState.currentLeadEmail} • Model: {aiProvider.toUpperCase()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Live Activity Log Feed */}
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Activity Feed:</p>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px]">
                    {progressState.activityLogs.length === 0 ? (
                      <p className="text-slate-400 italic">Starting generation queue...</p>
                    ) : (
                      progressState.activityLogs.map((log, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-slate-400 shrink-0">[{log.timestamp}]</span>
                          <span
                            className={
                              log.type === 'success'
                                ? 'text-emerald-600'
                                : log.type === 'skip'
                                ? 'text-amber-600'
                                : 'text-red-600'
                            }
                          >
                            {log.type === 'success' ? '✓ ' : log.type === 'skip' ? '⏩ ' : '✕ '}
                            {log.text}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Completion Actions */}
                {progressState.isFinished && (
                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button
                      onClick={() => setModalOpen(false)}
                      className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                    >
                      Close Modal
                    </button>
                    <Link
                      href="/review"
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/20"
                    >
                      View Review Queue <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              /* CONFIGURATION VIEW (before generation starts) */
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Ready to draft emails for <strong className="text-slate-900">{selectedCount} selected lead(s)</strong>.
                </p>

                {/* Sent Protection Notice */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>Sent Email Protection is Active</strong>: Any lead that has already received an email will automatically be protected and skipped. No duplicate emails will be sent.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-700">Select AI Model Provider:</label>

                  <div className="space-y-2">
                    {/* Groq AI Option */}
                    <label
                      className={`p-3 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all ${
                        aiProvider === 'groq'
                          ? 'bg-indigo-50/70 border-indigo-500 text-slate-900 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="provider"
                          checked={aiProvider === 'groq'}
                          onChange={() => setAiProvider('groq')}
                          className="accent-indigo-600"
                        />
                        <div>
                          <p className="text-xs font-bold text-indigo-700">Groq AI (Ultra Fast Llama Models)</p>
                          <p className="text-[10px] text-slate-500">High speed Llama 3.3 70B & 3.1 8B models</p>
                        </div>
                      </div>

                      {aiProvider === 'groq' && (
                        <div className="pl-6 pt-1 text-xs space-y-1">
                          <label className="font-semibold text-slate-700 text-[11px]">Select Groq Model:</label>
                          <select
                            value={groqModel}
                            onChange={(e) => setGroqModel(e.target.value)}
                            className="w-full p-2 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs font-mono"
                          >
                            <option value="groq/compound">groq/compound (Ultra Fast - Recommended)</option>
                            <option value="groq/compound-mini">groq/compound-mini (Lightning Fast)</option>
                            <option value="openai/gpt-oss-120b">openai/gpt-oss-120b (Deep Reasoning 120B)</option>
                            <option value="openai/gpt-oss-20b">openai/gpt-oss-20b (Fast 20B)</option>
                            <option value="qwen/qwen3.8-27b">qwen/qwen3.8-27b (27B Model)</option>
                          </select>
                        </div>
                      )}
                    </label>

                    {/* Claude Haiku 4.5 Option */}
                    <label
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        aiProvider === 'claude'
                          ? 'bg-indigo-50/70 border-indigo-500 text-slate-900 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="provider"
                          checked={aiProvider === 'claude'}
                          onChange={() => setAiProvider('claude')}
                          className="accent-indigo-600"
                        />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Anthropic Claude Haiku 4.5</p>
                          <p className="text-[10px] text-slate-500">claude-haiku-4-5 model</p>
                        </div>
                      </div>
                    </label>

                    {/* Gemini Option */}
                    <label
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        aiProvider === 'gemini'
                          ? 'bg-indigo-50/70 border-indigo-500 text-slate-900 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="provider"
                          checked={aiProvider === 'gemini'}
                          onChange={() => setAiProvider('gemini')}
                          className="accent-indigo-600"
                        />
                        <div>
                          <p className="text-xs font-semibold text-slate-800">Google Gemini Flash (gemini-flash-latest)</p>
                          <p className="text-[10px] text-slate-500">Fast structured JSON generation</p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleStartGeneration}
                  disabled={generating}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-cyan-200" /> Start Real-time AI Generation
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* IMAP Setup Guidance Modal (when App Password is not yet entered) */}
      {imapModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-cyan-600" />
                <h3 className="text-sm font-bold text-slate-900">Gmail Reply Sync Setup</h3>
              </div>
              <button onClick={() => setImapModalOpen(false)} className="text-slate-400 hover:text-slate-700 text-xs">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              To automatically detect recruiter replies sent to <strong className="text-slate-900">yuvamk6@gmail.com</strong>, your account needs an App Password:
            </p>

            <ol className="list-decimal list-inside text-[11px] text-slate-600 space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <li>Open your Google Account: <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-cyan-600 underline">myaccount.google.com/apppasswords</a></li>
              <li>Under 2-Step Verification, create an <strong>App password</strong> (e.g. named &quot;ReachOut AI&quot;).</li>
              <li>Copy the 16-letter password and paste it into <strong className="text-slate-800">Settings</strong> or <code className="text-cyan-700 font-mono">.env.local</code> as <code className="text-cyan-700 font-mono">IMAP_PASS</code>.</li>
            </ol>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setImapModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Close
              </button>
              <Link
                href="/settings"
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold text-center shadow-md shadow-cyan-600/20"
              >
                Go to Settings
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
