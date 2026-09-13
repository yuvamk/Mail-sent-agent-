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

  // Filter leads based on search query, filter tabs, and experience
  const filteredLeads = leads.filter((l) => {
    // Tab filters
    if (filterType === 'unsent' && (['sent', 'delivered', 'opened', 'replied'].includes(l.draftStatus || '') || !l.has_valid_email)) return false;
    if (filterType === 'drafted' && l.draftStatus !== 'drafted' && l.draftStatus !== 'reviewed' && l.draftStatus !== 'approved') return false;
    if (filterType === 'sent' && !['sent', 'delivered', 'opened'].includes(l.draftStatus || '')) return false;
    if (filterType === 'replied' && l.draftStatus !== 'replied') return false;
    if (filterType === 'valid' && !l.has_valid_email) return false;
    if (filterType === 'url' && l.has_valid_email) return false;

    // Experience Filter
    if (expFilter !== 'all') {
      const expText = (l.experience || '').toLowerCase();
      if (expFilter === '0-1' && !expText.includes('0') && !expText.includes('1')) return false;
      if (expFilter === '1-3' && !expText.includes('1') && !expText.includes('2') && !expText.includes('3')) return false;
      if (expFilter === '3-5' && !expText.includes('3') && !expText.includes('4') && !expText.includes('5')) return false;
      if (expFilter === '5+' && !expText.includes('5') && !expText.includes('6') && !expText.includes('7') && !expText.includes('8') && !expText.includes('10')) return false;
    }

    const query = search.toLowerCase().trim();
    if (!query) return true;

    return (
      (l.company && l.company.toLowerCase().includes(query)) ||
      (l.key_skills && l.key_skills.toLowerCase().includes(query)) ||
      (l.email && l.email.toLowerCase().includes(query)) ||
      (l.location && l.location.toLowerCase().includes(query)) ||
      (l.experience && l.experience.toLowerCase().includes(query))
    );
  });

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
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-blue-400" /> Outreach Dashboard & Lead Manager
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse extracted leads, track sent emails and recruiter replies, and queue AI drafts with live progress.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Check Email Replies Button */}
          <button
            onClick={handleSyncReplies}
            disabled={syncingReplies}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-all shadow-md hover:border-cyan-500/50"
            title="Scan your Gmail inbox for replies from recruiters"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${syncingReplies ? 'animate-spin' : ''}`} />
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
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all animate-scale-in"
            >
              <Sparkles className="w-4 h-4 text-cyan-300" /> Queue AI Drafts ({selectedCount} Selected)
            </button>
          )}
        </div>
      </div>

      {/* Sync Feedback Toast */}
      {syncFeedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border shadow-lg ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-red-950/60 border-red-800 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {syncFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{syncFeedback.message}</span>
          </div>
          <button onClick={() => setSyncFeedback(null)} className="text-slate-400 hover:text-white text-xs ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Error Alert */}
      {fetchError && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-sm flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button
            onClick={() => {
              setLoading(true);
              fetchLeads();
            }}
            className="px-3 py-1 rounded-lg bg-red-900 hover:bg-red-800 text-white text-xs font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Dashboard Top Stats Bar: Total Leads, Sent, Replies, Drafts, and Cost in Rupees */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Leads */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Total Leads</p>
            <p className="text-xl font-bold text-white">{stats.totalLeads}</p>
          </div>
        </div>

        {/* Total Mails Sent */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Mails Sent</p>
            <p className="text-xl font-bold text-emerald-400">{stats.sentCount}</p>
          </div>
        </div>

        {/* Replies Received */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Replies Got</p>
            <p className="text-xl font-bold text-cyan-300">{stats.repliedCount}</p>
          </div>
        </div>

        {/* AI Drafts Ready */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Drafts Ready</p>
            <p className="text-xl font-bold text-indigo-300">{stats.draftedCount}</p>
          </div>
        </div>

        {/* Total AI Token Cost in Rupees */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-500/30 shadow-md flex items-center gap-3 col-span-2 sm:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">AI Token Cost (₹)</p>
            <p className="text-xl font-bold text-amber-300">₹{stats.totalCostINR.toFixed(2)}</p>
            <p className="text-[10px] text-slate-500">{stats.totalTokens.toLocaleString()} tokens</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col lg:flex-row gap-4 items-center justify-between shadow-xl">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search company, skills, exp, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Experience Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300">
            <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold text-slate-400">Exp:</span>
            <select
              value={expFilter}
              onChange={(e) => setExpFilter(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-slate-900">All Experience</option>
              <option value="0-1" className="bg-slate-900">0 - 1 Years</option>
              <option value="1-3" className="bg-slate-900">1 - 3 Years</option>
              <option value="3-5" className="bg-slate-900">3 - 5 Years</option>
              <option value="5+" className="bg-slate-900">5+ Years</option>
            </select>
          </div>

          {/* Status Tabs */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex flex-wrap text-xs font-medium gap-1">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                filterType === 'all' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({leads.length})
            </button>
            <button
              onClick={() => setFilterType('unsent')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                filterType === 'unsent' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Unsent ({unsentEligibleCount})
            </button>
            <button
              onClick={() => setFilterType('sent')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                filterType === 'sent' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sent ({stats.sentCount})
            </button>
            <button
              onClick={() => setFilterType('replied')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                filterType === 'replied' ? 'bg-cyan-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Replies ({stats.repliedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Leads Table with Serial Numbers (#) */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-4 w-10 text-center">
                  <button
                    onClick={toggleSelectAll}
                    title="Select all un-sent leads (protected sent leads are excluded)"
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    {selectedIds.length > 0 && selectedIds.length === eligibleUnsentLeadIds.length ? (
                      <CheckSquare className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-4 w-12 text-center text-slate-500 font-mono">#</th>
                <th className="p-4">Company</th>
                <th className="p-4">Required Skills</th>
                <th className="p-4">Exp & Salary</th>
                <th className="p-4">Contact / Link</th>
                <th className="p-4 text-center">Outreach Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto mb-2" />
                    Loading leads database...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                    No leads found matching current filters.
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
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-blue-950/20' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-4 text-center">
                        {lead.has_valid_email ? (
                          <button
                            onClick={() => toggleSelectOne(lead.id)}
                            className="text-slate-400 hover:text-white"
                            title={isSent ? 'Outreach email already sent (Protected)' : 'Select for AI generation'}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-400" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        ) : (
                          <span className="text-slate-600 cursor-not-allowed">–</span>
                        )}
                      </td>

                      {/* Serial Number (#) */}
                      <td className="p-4 text-center font-mono text-slate-500 text-xs font-semibold">
                        #{index + 1}
                      </td>

                      {/* Company & Location */}
                      <td className="p-4">
                        <p className="font-bold text-slate-100 text-sm">{lead.company}</p>
                        <p className="text-[11px] text-slate-400">{lead.location || 'Location unspecified'}</p>
                      </td>

                      {/* Key Skills */}
                      <td className="p-4 max-w-xs">
                        <p className="truncate text-slate-300" title={lead.key_skills || ''}>
                          {lead.key_skills || 'N/A'}
                        </p>
                      </td>

                      {/* Experience & Salary */}
                      <td className="p-4">
                        <p className="text-slate-300 font-semibold text-emerald-400">
                          {lead.experience ? `${lead.experience}` : 'Exp N/A'}
                        </p>
                        <p className="text-[11px] text-slate-400">{lead.salary || 'Salary N/A'}</p>
                      </td>

                      {/* Contact / Email / Link */}
                      <td className="p-4">
                        {lead.has_valid_email && lead.email ? (
                          <div className="flex items-center gap-1.5 text-emerald-400 font-mono">
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
                            className="inline-flex items-center gap-1 text-cyan-400 hover:underline font-medium"
                          >
                            Apply Link <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-500 italic">No Direct Contact</span>
                        )}
                      </td>

                      {/* Outreach Status */}
                      <td className="p-4 text-center">
                        {isReplied ? (
                          <span className="px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold inline-flex items-center gap-1">
                            <MessageSquare className="w-3 h-3 text-cyan-400" /> Replied
                          </span>
                        ) : lead.draftStatus === 'opened' ? (
                          <span className="px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-bold inline-flex items-center gap-1">
                            <Eye className="w-3 h-3 text-purple-400" /> Opened
                          </span>
                        ) : lead.draftStatus === 'delivered' ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Delivered
                          </span>
                        ) : lead.draftStatus === 'bounced' ? (
                          <span className="px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-bold inline-flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-rose-400" /> Bounced
                          </span>
                        ) : isSent ? (
                          <span className="px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[10px] font-bold inline-flex items-center gap-1">
                            <Send className="w-3 h-3 text-blue-400" /> Sent
                          </span>
                        ) : lead.draftStatus === 'failed' ? (
                          <span className="px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-[10px] font-bold inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-red-400" /> Failed
                          </span>
                        ) : lead.draftStatus ? (
                          <span className="px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[10px] font-semibold">
                            {lead.draftStatus}
                          </span>
                        ) : lead.has_valid_email ? (
                          <span className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[10px]">
                            Not Drafted
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-slate-500 text-[10px]">Portal Link</span>
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full space-y-5 shadow-2xl animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <Bot className="w-6 h-6 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Queue Sequential AI Drafts</h3>
                  <p className="text-[11px] text-slate-400">
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
                  className="text-slate-400 hover:text-white text-sm"
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
                  <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                    {progressState.inProgress && <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />}
                    {progressState.isFinished ? '✓ Batch Generation Finished' : 'Processing Outreach Queue'}
                  </span>
                  <span className="font-mono text-cyan-400 font-extrabold text-sm">
                    {progressState.percent}%
                  </span>
                </div>

                {/* Animated Progress Bar */}
                <div className="w-full bg-slate-950 rounded-full h-3 p-0.5 border border-slate-800 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-300 shadow-sm shadow-cyan-500/50"
                    style={{ width: `${progressState.percent}%` }}
                  />
                </div>

                {/* Real-time Counters Grid */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-400 font-medium">Generated</p>
                    <p className="text-emerald-400 font-bold text-sm">
                      {progressState.completedCount} / {progressState.totalToProcess}
                    </p>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-400 font-medium">Remaining</p>
                    <p className="text-cyan-300 font-bold text-sm">
                      {Math.max(0, progressState.totalToProcess - progressState.completedCount - progressState.errorCount)}
                    </p>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-400 font-medium">Sent (Skipped)</p>
                    <p className="text-amber-400 font-bold text-sm">{progressState.skippedCount}</p>
                  </div>
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                    <p className="text-[10px] text-slate-400 font-medium">Errors</p>
                    <p className="text-red-400 font-bold text-sm">{progressState.errorCount}</p>
                  </div>
                </div>

                {/* Active Lead Pill */}
                {progressState.inProgress && (
                  <div className="p-3 bg-blue-950/40 border border-blue-800/50 rounded-xl flex items-center gap-2.5 text-xs">
                    <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 animate-spin" />
                    <div className="truncate">
                      <p className="font-semibold text-white truncate">
                        Processing: {progressState.currentLeadName}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {progressState.currentLeadEmail} • Model: {aiProvider.toUpperCase()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Live Activity Log Feed */}
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Activity Feed:</p>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px]">
                    {progressState.activityLogs.length === 0 ? (
                      <p className="text-slate-500 italic">Starting generation queue...</p>
                    ) : (
                      progressState.activityLogs.map((log, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                          <span
                            className={
                              log.type === 'success'
                                ? 'text-emerald-400'
                                : log.type === 'skip'
                                ? 'text-amber-400'
                                : 'text-red-400'
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
                      className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                    >
                      Close Modal
                    </button>
                    <Link
                      href="/review"
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-600/20"
                    >
                      View Review Queue <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              /* CONFIGURATION VIEW (before generation starts) */
              <div className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Ready to draft emails for <strong className="text-white">{selectedCount} selected lead(s)</strong>.
                </p>

                {/* Sent Protection Notice */}
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-xs text-emerald-300 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>Sent Email Protection is Active</strong>: Any lead that has already received an email will automatically be protected and skipped. No duplicate emails will be sent.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-300">Select AI Model Provider:</label>

                  <div className="space-y-2">
                    {/* Groq AI Option */}
                    <label
                      className={`p-3 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all ${
                        aiProvider === 'groq'
                          ? 'bg-indigo-950/50 border-indigo-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="provider"
                          checked={aiProvider === 'groq'}
                          onChange={() => setAiProvider('groq')}
                          className="accent-indigo-500"
                        />
                        <div>
                          <p className="text-xs font-bold text-emerald-400">Groq AI (Ultra Fast Llama Models)</p>
                          <p className="text-[10px] text-slate-400">High speed Llama 3.3 70B & 3.1 8B models</p>
                        </div>
                      </div>

                      {aiProvider === 'groq' && (
                        <div className="pl-6 pt-1 text-xs space-y-1">
                          <label className="font-semibold text-slate-300 text-[11px]">Select Groq Model:</label>
                          <select
                            value={groqModel}
                            onChange={(e) => setGroqModel(e.target.value)}
                            className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono"
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
                          ? 'bg-indigo-950/50 border-indigo-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="provider"
                          checked={aiProvider === 'claude'}
                          onChange={() => setAiProvider('claude')}
                          className="accent-indigo-500"
                        />
                        <div>
                          <p className="text-xs font-semibold">Anthropic Claude Haiku 4.5</p>
                          <p className="text-[10px] text-slate-400">claude-haiku-4-5 model</p>
                        </div>
                      </div>
                    </label>

                    {/* Gemini Option */}
                    <label
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        aiProvider === 'gemini'
                          ? 'bg-indigo-950/50 border-indigo-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="provider"
                          checked={aiProvider === 'gemini'}
                          onChange={() => setAiProvider('gemini')}
                          className="accent-indigo-500"
                        />
                        <div>
                          <p className="text-xs font-semibold">Google Gemini Flash (gemini-flash-latest)</p>
                          <p className="text-[10px] text-slate-400">Fast structured JSON generation</p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleStartGeneration}
                  disabled={generating}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Gmail Reply Sync Setup</h3>
              </div>
              <button onClick={() => setImapModalOpen(false)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              To automatically detect recruiter replies sent to <strong className="text-white">yuvamk6@gmail.com</strong>, your account needs an App Password:
            </p>

            <ol className="list-decimal list-inside text-[11px] text-slate-400 space-y-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800">
              <li>Open your Google Account: <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-cyan-400 underline">myaccount.google.com/apppasswords</a></li>
              <li>Under 2-Step Verification, create an <strong>App password</strong> (e.g. named &quot;ReachOut AI&quot;).</li>
              <li>Copy the 16-letter password and paste it into <strong className="text-slate-300">Settings</strong> or <code className="text-cyan-300 font-mono">.env.local</code> as <code className="text-cyan-300 font-mono">IMAP_PASS</code>.</li>
            </ol>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setImapModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Close
              </button>
              <Link
                href="/settings"
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold text-center"
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
