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
} from 'lucide-react';

interface Draft {
  id: string;
  lead_id: string;
  resume_id: string;
  ai_provider: string;
  subject: string;
  body: string;
  status: string; // drafted | reviewed | approved | sent | failed
  edited_by_user: boolean;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
  leads: {
    company: string;
    location: string | null;
    salary: string | null;
    experience: string | null;
    key_skills: string | null;
    email: string | null;
    contact_number: string | null;
    raw_data?: Record<string, string> | null;
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

  // Form State
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
      const res = await fetch('/api/drafts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: [activeDraft.lead_id],
          provider,
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

  const [sendingAll, setSendingAll] = useState(false);

  const handleSendAll = async () => {
    const pendingDrafts = drafts.filter((d) => d.status !== 'sent');
    if (pendingDrafts.length === 0) {
      setAlert({ type: 'error', message: 'No unsent drafts currently available in queue.' });
      return;
    }

    if (!confirm(`Are you sure you want to send all ${pendingDrafts.length} unsent email drafts now via SMTP?`)) {
      return;
    }

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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <MailCheck className="w-7 h-7 text-cyan-400" /> Draft Review & Manual Dispatch Queue
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Review, edit, and manually approve AI outreach emails. Each email is sent only when you click <strong>Approve & Send</strong> or use <strong>Send All</strong>.
          </p>
        </div>

        <button
          onClick={handleSendAll}
          disabled={sendingAll || loading || drafts.filter((d) => d.status !== 'sent').length === 0}
          id="btn-send-all-drafts"
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-extrabold shadow-lg shadow-cyan-600/30 flex items-center gap-2.5 transition-all disabled:opacity-50"
        >
          {sendingAll ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Batch Dispatching...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 text-cyan-200" /> Send All ({drafts.filter((d) => d.status !== 'sent').length} Pending)
            </>
          )}
        </button>
      </div>

      {/* Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Draft Queue List */}
        <div className="lg:col-span-4 rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3 shadow-xl max-h-[750px] overflow-y-auto">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-2 flex justify-between items-center">
            <span>Draft Queue ({drafts.length})</span>
            <span className="text-[10px] text-cyan-400 font-mono">1-by-1 Approval</span>
          </h2>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400 mx-auto mb-2" />
              Loading drafts...
            </div>
          ) : drafts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 italic">
              No drafts generated yet. Go to <strong className="text-slate-300">Leads Dashboard</strong> and click &quot;Generate Drafts&quot;.
            </div>
          ) : (
            <div className="space-y-2">
              {drafts.map((d) => {
                const isActive = d.id === selectedDraftId;

                return (
                  <button
                    key={d.id}
                    onClick={() => handleSelectDraft(d)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all space-y-2 ${
                      isActive
                        ? 'bg-slate-800 border-cyan-500/70 shadow-lg shadow-cyan-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-100 truncate max-w-[170px]">
                        {d.leads.company}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          d.status === 'sent'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : d.status === 'failed'
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : d.status === 'reviewed'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {d.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 truncate">{d.subject}</p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>{d.ai_provider.toUpperCase()}</span>
                      <span>{d.leads.email}</span>
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
              {/* Lead Context Card */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Building className="w-5 h-5 text-blue-400" /> {activeDraft.leads.company}
                    </h2>
                    <p className="text-xs text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                      <Mail className="w-3.5 h-3.5" /> {activeDraft.leads.email}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-950 border border-indigo-800 text-indigo-300 text-xs font-semibold flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5 text-indigo-400" /> Generated via {activeDraft.ai_provider.toUpperCase()}
                    </span>

                    <button
                      onClick={() => handleRegenerate(activeDraft.ai_provider === 'claude' ? 'gemini' : 'claude')}
                      disabled={regenerating}
                      title="Switch model & regenerate draft"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin text-cyan-400' : ''}`} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
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
                    <span className="text-slate-400 font-medium">Required Skills: </span>
                    <span className="text-slate-200">{activeDraft.leads.key_skills}</span>
                  </div>
                )}

                {activeDraft.leads.raw_data && Object.keys(activeDraft.leads.raw_data).length > 0 && (
                  <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
                    <p className="text-[11px] font-semibold text-cyan-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Dynamic Excel Custom Fields (Used by AI):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(activeDraft.leads.raw_data).map(([k, v]) => (
                        <span key={k} className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono">
                          <strong className="text-slate-400 font-sans">{k}:</strong> {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attached Resume Info */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-cyan-400" /> Attachment:
                    <strong className="text-slate-200 font-mono">
                      {activeDraft.resumes?.file_name || 'Active_Resume.pdf'}
                    </strong>
                  </span>
                  <span className="text-[11px] text-slate-500 italic">Attached automatically via Nodemailer</span>
                </div>
              </div>

              {/* Email Editor Card */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" /> Outreach Email Content Editor
                  </h3>
                  {activeDraft.edited_by_user && (
                    <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                      Edited by User
                    </span>
                  )}
                </div>

                {/* Subject Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Subject Line:</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    id="input-email-subject"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm font-medium focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                {/* Body Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Email Body Text:</label>
                  <textarea
                    rows={12}
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    id="input-email-body"
                    className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-sans leading-relaxed focus:outline-none focus:border-cyan-500 transition-colors whitespace-pre-wrap"
                  />
                </div>

                {/* Feedback Alerts */}
                {alert && (
                  <div
                    className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
                      alert.type === 'success'
                        ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                        : 'bg-red-950/60 border border-red-800 text-red-300'
                    }`}
                  >
                    {alert.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span>{alert.message}</span>
                  </div>
                )}

                {activeDraft.status === 'failed' && activeDraft.error_message && (
                  <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5 text-red-400">
                      <ShieldAlert className="w-4 h-4" /> Last Send Attempt Failed:
                    </p>
                    <p className="text-[11px] font-mono text-red-300/80">{activeDraft.error_message}</p>
                  </div>
                )}

                {/* Action Buttons Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-800">
                  <button
                    onClick={handleSaveEdit}
                    disabled={saving || sending}
                    id="btn-save-draft-edit"
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-slate-400" />}
                    Save Edits Only
                  </button>

                  <button
                    onClick={handleApproveAndSend}
                    disabled={sending || saving}
                    id="btn-approve-and-send"
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-600/30 flex items-center gap-2.5 transition-all disabled:opacity-50"
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
              </div>
            </div>
          ) : (
            <div className="p-16 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3 shadow-xl">
              <MailCheck className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No Draft Selected</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Select an email draft from the left queue to review its contents, make edits, and manually approve for sending.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
