'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import {
  MailCheck,
  Send,
  Save,
  RefreshCw,
  FileText,
  Building,
  MapPin,
  Briefcase,
  DollarSign,
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Bot,
  ShieldAlert,
  MessageSquare,
  Clock,
  RotateCcw,
  Check,
  Calendar,
} from 'lucide-react';

interface Draft {
  id: string;
  lead_id: string;
  resume_id: string;
  ai_provider: string;
  subject: string;
  body: string;
  status: string; // drafted | reviewed | approved | sent | replied | failed
  edited_by_user: boolean;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
  leads: {
    id: string;
    company: string;
    location: string | null;
    salary: string | null;
    experience: string | null;
    key_skills: string | null;
    email: string | null;
    contact_number: string | null;
    raw_data?: Record<string, any> | null;
  };
  resumes: {
    file_name: string;
  } | null;
}

export default function DraftReviewPage() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);

  // Tab Filtering: 'pending' | 'sent' | 'replied' | 'failed' | 'all'
  const [activeTab, setActiveTab] = useState<'pending' | 'sent' | 'replied' | 'failed' | 'all'>('pending');

  // Form State
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Record Reply Modal State
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyNotes, setReplyNotes] = useState('');
  const [savingReply, setSavingReply] = useState(false);

  const fetchDrafts = async (autoSelectId?: string) => {
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
        const list: Draft[] = data.drafts || [];
        setDrafts(list);

        if (list.length > 0) {
          const target = autoSelectId
            ? list.find((d) => d.id === autoSelectId) || list[0]
            : selectedDraftId
            ? list.find((d) => d.id === selectedDraftId) || list[0]
            : list[0];

          setSelectedDraftId(target.id);
          setSubject(target.subject || '');
          setBodyText(target.body || '');
        }
      }
    } catch (e) {
      console.error('Failed to fetch drafts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const activeDraft = drafts.find((d) => d.id === selectedDraftId);

  // Filter drafts based on active tab
  const draftsPending = drafts.filter(
    (d) => d.status === 'drafted' || d.status === 'reviewed' || d.status === 'approved'
  );
  const draftsSent = drafts.filter((d) => d.status === 'sent' || d.status === 'delivered' || d.status === 'opened');
  const draftsReplied = drafts.filter((d) => d.status === 'replied');
  const draftsFailed = drafts.filter((d) => d.status === 'failed' || d.status === 'bounced');

  const visibleDrafts = drafts.filter((d) => {
    if (activeTab === 'pending') {
      return d.status === 'drafted' || d.status === 'reviewed' || d.status === 'approved';
    }
    if (activeTab === 'sent') return d.status === 'sent' || d.status === 'delivered' || d.status === 'opened';
    if (activeTab === 'replied') return d.status === 'replied';
    if (activeTab === 'failed') return d.status === 'failed' || d.status === 'bounced';
    return true;
  });

  const handleSelectDraft = (d: Draft) => {
    setSelectedDraftId(d.id);
    setSubject(d.subject || '');
    setBodyText(d.body || '');
    setAlert(null);
  };

  const handleSaveEdit = async () => {
    if (!activeDraft) return;

    setSaving(true);
    setAlert(null);

    try {
      const res = await fetch('/api/drafts/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId: activeDraft.id,
          subject,
          body: bodyText,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save draft edits');
      }

      setAlert({ type: 'success', message: 'Draft changes saved successfully.' });
      fetchDrafts(activeDraft.id);
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'Error saving changes' });
    } finally {
      setSaving(false);
    }
  };

  const handleApproveAndSend = async () => {
    if (!activeDraft) return;

    setSending(true);
    setAlert(null);

    try {
      const res = await fetch('/api/drafts/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId: activeDraft.id,
          subject,
          body: bodyText,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send email via SMTP');
      }

      setAlert({ type: 'success', message: `Email successfully sent to ${activeDraft.leads.email}!` });
      fetchDrafts(activeDraft.id);
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'SMTP Dispatch Failed. Error recorded.' });
      fetchDrafts(activeDraft.id);
    } finally {
      setSending(false);
    }
  };

  const handleRegenerate = async (provider: 'claude' | 'gemini') => {
    if (!activeDraft) return;

    setRegenerating(true);
    setAlert(null);

    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      const res = await fetch('/api/drafts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          leadIds: [activeDraft.lead_id],
          provider,
          userId: session?.user?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to regenerate draft');
      }

      setAlert({ type: 'success', message: `Draft regenerated using ${provider.toUpperCase()}` });
      fetchDrafts(activeDraft.id);
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'Failed to regenerate' });
    } finally {
      setRegenerating(false);
    }
  };

  const handleSendAll = async () => {
    if (draftsPending.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to dispatch all ${draftsPending.length} pending email drafts via SMTP?`
    );
    if (!confirmed) return;

    setSendingAll(true);
    setAlert(null);

    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();

      const res = await fetch('/api/drafts/send-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({ userId: session?.user?.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Batch email send failed');
      }

      setAlert({
        type: 'success',
        message: `Batch send completed! Successfully sent ${data.sentCount} emails.${
          data.failedCount > 0 ? ` (${data.failedCount} failed)` : ''
        }`,
      });
      fetchDrafts(selectedDraftId || undefined);
    } catch (err: any) {
      setAlert({ type: 'error', message: err?.message || 'Failed to dispatch all emails' });
    } finally {
      setSendingAll(false);
    }
  };

  // Submit manual recruiter reply
  const handleSaveReply = async () => {
    if (!activeDraft) return;

    setSavingReply(true);
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      const res = await fetch('/api/replies/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          action: 'record',
          draftId: activeDraft.id,
          replyText,
          notes: replyNotes,
          userId: session?.user?.id,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setReplyModalOpen(false);
        setReplyText('');
        setReplyNotes('');
        setAlert({ type: 'success', message: 'Recruiter reply recorded successfully!' });
        fetchDrafts(activeDraft.id);
        setActiveTab('replied');
      } else {
        setAlert({ type: 'error', message: data.error || 'Failed to record reply' });
      }
    } catch (e: any) {
      setAlert({ type: 'error', message: e?.message || 'Error recording reply' });
    } finally {
      setSavingReply(false);
    }
  };

  // Recruiter reply info from lead raw_data
  const replyData = activeDraft?.leads?.raw_data?.reply;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <MailCheck className="w-7 h-7 text-cyan-600" /> Outreach Queue & Dispatch Manager
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review AI drafts, inspect delivered emails and recruiter replies, or batch-dispatch pending outreach.
          </p>
        </div>

        {/* Batch Dispatch Button */}
        {draftsPending.length > 0 && (
          <button
            onClick={handleSendAll}
            disabled={sendingAll || loading}
            id="btn-send-all-drafts"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {sendingAll ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Batch Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-cyan-200" /> Send All ({draftsPending.length} Pending)
              </>
            )}
          </button>
        )}
      </div>

      {/* Category Tabs: Drafts | Sent | Replies | Failed | All */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'pending'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Bot className="w-3.5 h-3.5" /> Pending Drafts
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${activeTab === 'pending' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {draftsPending.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('sent')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'sent'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Send className="w-3.5 h-3.5" /> Sent Mails
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${activeTab === 'sent' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {draftsSent.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('replied')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'replied'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" /> Replies Got
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${activeTab === 'replied' ? 'bg-cyan-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {draftsReplied.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('failed')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'failed'
              ? 'bg-red-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" /> Failed
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${activeTab === 'failed' ? 'bg-red-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {draftsFailed.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          All ({drafts.length})
        </button>
      </div>

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Draft Queue List with Serial Numbers (#) */}
        <div className="lg:col-span-4 rounded-2xl bg-white border border-slate-200 p-4 space-y-3 shadow-sm max-h-[750px] overflow-y-auto">
          <div className="flex items-center justify-between px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>
              {activeTab === 'pending'
                ? `Drafts Queue (${draftsPending.length})`
                : activeTab === 'sent'
                ? `Sent Outreach (${draftsSent.length})`
                : activeTab === 'replied'
                ? `Recruiter Replies (${draftsReplied.length})`
                : activeTab === 'failed'
                ? `Failed Dispatches (${draftsFailed.length})`
                : `All Items (${drafts.length})`}
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-600 mx-auto mb-2" />
              Loading outreach records...
            </div>
          ) : visibleDrafts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 italic">
              {activeTab === 'pending'
                ? 'No pending drafts. Go to Leads Dashboard to queue new drafts.'
                : activeTab === 'sent'
                ? 'No outreach emails sent yet.'
                : activeTab === 'replied'
                ? 'No replies recorded yet. Click "Check / Sync Replies" to scan your inbox.'
                : activeTab === 'failed'
                ? 'No failed email deliveries!'
                : 'No drafts found.'}
            </div>
          ) : (
            <div className="space-y-2">
              {visibleDrafts.map((d, index) => {
                const isActive = d.id === selectedDraftId;
                const isReplied = d.status === 'replied';
                const isSent = d.status === 'sent';
                const isFailed = d.status === 'failed';

                return (
                  <button
                    key={d.id}
                    onClick={() => handleSelectDraft(d)}
                    className={`w-full text-left p-3 rounded-xl border transition-all space-y-2 ${
                      isActive
                        ? 'bg-blue-50/70 border-cyan-500 shadow-sm'
                        : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {/* Serial Number & Company */}
                      <div className="flex items-center gap-1.5 truncate max-w-[190px]">
                        <span className="text-[10px] font-mono text-slate-400 font-bold shrink-0">
                          #{index + 1}
                        </span>
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {d.leads.company}
                        </span>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isReplied
                            ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                            : d.status === 'opened'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : d.status === 'delivered'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : d.status === 'bounced'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : isSent
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : isFailed
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : d.status === 'reviewed'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {d.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 truncate">{d.subject}</p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{d.ai_provider.toUpperCase()}</span>
                      <span className="truncate max-w-[140px]">{d.leads.email}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Draft Editor & Context Panel */}
        <div className="lg:col-span-8 space-y-6">
          {activeDraft ? (
            <div className="space-y-6">
              {/* STATUS BANNER (Sent / Replied / Failed) */}
              {activeDraft.status === 'replied' ? (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-50 via-white to-cyan-50 border border-cyan-200 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-800 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-cyan-600" /> Recruiter Replied to Your Email!
                    </span>
                    {replyData?.received_at && (
                      <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-600" />{' '}
                        {new Date(replyData.received_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {replyData && (
                    <div className="p-3 bg-white rounded-xl border border-cyan-200 text-xs space-y-1">
                      <p className="font-semibold text-cyan-900">
                        From: <span className="font-mono text-slate-800">{replyData.from}</span>
                      </p>
                      <p className="text-slate-700 leading-relaxed italic">&quot;{replyData.snippet}&quot;</p>
                      {replyData.notes && (
                        <p className="text-[11px] text-slate-500 pt-1">
                          <strong>Notes:</strong> {replyData.notes}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : activeDraft.status === 'sent' ? (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-white to-emerald-50 border border-emerald-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-800">
                        Email Delivered via SMTP to {activeDraft.leads.email}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Dispatched at:{' '}
                        {activeDraft.sent_at
                          ? new Date(activeDraft.sent_at).toLocaleString()
                          : 'Recorded as Sent'}
                      </p>
                    </div>
                  </div>

                  {/* Log Recruiter Reply Button */}
                  <button
                    onClick={() => {
                      setReplyText('');
                      setReplyNotes('');
                      setReplyModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-cyan-600/20"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Log Recruiter Reply
                  </button>
                </div>
              ) : activeDraft.status === 'failed' ? (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-red-50 via-white to-red-50 border border-red-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-red-800">Delivery Attempt Failed</p>
                      <p className="text-[11px] text-red-600 font-mono">
                        {activeDraft.error_message || 'SMTP rejection or recipient unreachable'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleApproveAndSend}
                    disabled={sending}
                    className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-red-600/20"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Retry Dispatch
                  </button>
                </div>
              ) : null}

              {/* Lead Context Card */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Building className="w-5 h-5 text-blue-600" /> {activeDraft.leads.company}
                    </h2>
                    <p className="text-xs text-emerald-600 font-mono flex items-center gap-1 mt-0.5">
                      <Mail className="w-3.5 h-3.5" /> {activeDraft.leads.email}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5 text-indigo-600" /> Generated via {activeDraft.ai_provider.toUpperCase()}
                    </span>

                    {activeDraft.status !== 'sent' && activeDraft.status !== 'replied' && (
                      <button
                        onClick={() =>
                          handleRegenerate(activeDraft.ai_provider === 'claude' ? 'gemini' : 'claude')
                        }
                        disabled={regenerating}
                        title="Switch model & regenerate draft"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${regenerating ? 'animate-spin text-cyan-600' : ''}`}
                        />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{activeDraft.leads.location || 'Location unspecified'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                    <span>Exp: {activeDraft.leads.experience || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                    <span>Salary: {activeDraft.leads.salary || 'N/A'}</span>
                  </div>
                </div>

                {activeDraft.leads.key_skills && (
                  <div className="pt-1 text-xs">
                    <span className="text-slate-500 font-medium">Required Skills: </span>
                    <span className="text-slate-800 font-medium">{activeDraft.leads.key_skills}</span>
                  </div>
                )}

                {/* Attached Resume Info */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-cyan-600" /> Attachment:
                    <strong className="text-slate-800 font-mono">
                      {activeDraft.resumes?.file_name || 'Active_Resume.pdf'}
                    </strong>
                  </span>
                  <span className="text-[11px] text-slate-400 italic">Attached automatically via Nodemailer</span>
                </div>
              </div>

              {/* Email Content Preview / Editor Card */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-600" />
                    {activeDraft.status === 'sent' || activeDraft.status === 'replied'
                      ? 'Outreach Email (Sent)'
                      : 'Outreach Email Content Editor'}
                  </h3>
                  {activeDraft.edited_by_user && (
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                      Edited by User
                    </span>
                  )}
                </div>

                {/* Subject Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Subject Line:</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={activeDraft.status === 'sent' || activeDraft.status === 'replied'}
                    id="input-email-subject"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm font-medium focus:outline-none focus:border-cyan-500 focus:bg-white transition-colors disabled:opacity-75"
                  />
                </div>

                {/* Body Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Email Body:</label>
                  <textarea
                    rows={12}
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    disabled={activeDraft.status === 'sent' || activeDraft.status === 'replied'}
                    id="input-email-body"
                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-sans leading-relaxed focus:outline-none focus:border-cyan-500 focus:bg-white transition-colors whitespace-pre-wrap disabled:opacity-75"
                  />
                </div>

                {/* Feedback Alerts */}
                {alert && (
                  <div
                    className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
                      alert.type === 'success'
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-red-50 border border-red-200 text-red-800'
                    }`}
                  >
                    {alert.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <span>{alert.message}</span>
                  </div>
                )}

                {/* Action Buttons Bar (for unsent drafts) */}
                {activeDraft.status !== 'sent' && activeDraft.status !== 'replied' && (
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving || sending}
                      id="btn-save-draft-edit"
                      className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 text-slate-500" />
                      )}
                      Save Edits Only
                    </button>

                    <button
                      onClick={handleApproveAndSend}
                      disabled={sending || saving}
                      id="btn-approve-and-send"
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-extrabold shadow-md shadow-emerald-600/20 flex items-center gap-2.5 transition-all disabled:opacity-50"
                    >
                      {sending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Dispatching via SMTP...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" /> Approve & Send Now
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-16 rounded-2xl bg-white border border-slate-200 text-center space-y-3 shadow-sm">
              <MailCheck className="w-12 h-12 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No Item Selected</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Select an item from the left queue to review its contents, track status, or record replies.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Manual Recruiter Reply Recording Modal */}
      {replyModalOpen && activeDraft && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-cyan-600" />
                <h3 className="text-sm font-bold text-slate-900">Record Recruiter Response</h3>
              </div>
              <button
                onClick={() => setReplyModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Record an incoming email reply or message from{' '}
              <strong className="text-slate-900">{activeDraft.leads.company}</strong> ({activeDraft.leads.email}):
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-600">Reply Snippet / Content:</label>
              <textarea
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="e.g. 'Hi Yuvam, thanks for reaching out. We would love to set up an introductory call...'"
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-cyan-500 focus:bg-white transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-600">Additional Notes / Next Steps:</label>
              <input
                type="text"
                value={replyNotes}
                onChange={(e) => setReplyNotes(e.target.value)}
                placeholder="e.g. Interview scheduled for Tuesday, salary discussed..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:border-cyan-500 focus:bg-white transition-colors"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setReplyModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReply}
                disabled={savingReply || (!replyText.trim() && !replyNotes.trim())}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-cyan-600/20 disabled:opacity-50"
              >
                {savingReply ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save Recruiter Reply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
