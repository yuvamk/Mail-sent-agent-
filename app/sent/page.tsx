'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { Send, CheckCircle2, AlertTriangle, RefreshCw, Mail, Calendar, Loader2, Eye, Building } from 'lucide-react';

interface SentRecord {
  id: string;
  lead_id: string;
  ai_provider: string;
  subject: string;
  body: string;
  status: string;
  error_message: string | null;
  created_at: string;
  sent_at: string | null;
  leads: {
    company: string;
    email: string | null;
    key_skills: string | null;
  };
}

export default function SentHistoryPage() {
  const router = useRouter();
  const [records, setRecords] = useState<SentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModalRecord, setActiveModalRecord] = useState<SentRecord | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

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
        // Filter sent and failed records
        const historyList = allDrafts.filter((d) => d.status === 'sent' || d.status === 'failed');
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Send className="w-7 h-7 text-emerald-400" /> Sent Outreach & Audit Log
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Complete audit history of emails dispatched via SMTP with exact timestamps and error diagnostics.
        </p>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-4">Recipient & Company</th>
                <th className="p-4">Subject Line</th>
                <th className="p-4">AI Model</th>
                <th className="p-4">Status</th>
                <th className="p-4">Sent Timestamp</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mx-auto mb-2" />
                    Loading audit history...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 italic">
                    No emails dispatched yet. Approved emails will appear here.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-white text-sm">{r.leads?.company || 'Company'}</p>
                      <p className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {r.leads?.email || 'N/A'}
                      </p>
                    </td>

                    <td className="p-4 max-w-xs">
                      <p className="truncate text-slate-200 font-medium" title={r.subject}>
                        {r.subject}
                      </p>
                    </td>

                    <td className="p-4 font-mono text-indigo-300 uppercase">{r.ai_provider}</td>

                    <td className="p-4">
                      {r.status === 'sent' ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold flex items-center gap-1 w-max">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Sent
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold flex items-center gap-1 w-max">
                          <AlertTriangle className="w-3 h-3 text-red-400" /> Failed
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-slate-400 font-mono text-[11px]">
                      {r.sent_at ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {new Date(r.sent_at).toLocaleString()}
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </td>

                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setActiveModalRecord(r)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          title="View Sent Payload"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {r.status === 'failed' && (
                          <button
                            onClick={() => handleRetrySend(r)}
                            disabled={retryingId === r.id}
                            className="p-1.5 rounded-lg bg-red-900/40 hover:bg-red-800/60 text-red-300 transition-colors disabled:opacity-50"
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

      {/* Modal View Payload */}
      {activeModalRecord && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">{activeModalRecord.leads?.company}</h3>
              </div>
              <button onClick={() => setActiveModalRecord(null)} className="text-slate-400 hover:text-white text-sm">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400">Recipient Email: </span>
                <span className="text-emerald-400 font-mono font-semibold">{activeModalRecord.leads?.email}</span>
              </div>
              <div>
                <span className="text-slate-400">Subject: </span>
                <span className="text-white font-medium">{activeModalRecord.subject}</span>
              </div>
              <div>
                <p className="text-slate-400 mb-1">Body Text Sent:</p>
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-sans leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {activeModalRecord.body}
                </div>
              </div>

              {activeModalRecord.error_message && (
                <div className="p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-300">
                  <p className="font-semibold text-red-400">SMTP Diagnostic Error:</p>
                  <p className="font-mono text-[11px] mt-1">{activeModalRecord.error_message}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveModalRecord(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
