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
}

export default function LeadsPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'valid' | 'url'>('all');
  const [expFilter, setExpFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  // AI Generation State
  const [aiProvider, setAiProvider] = useState<'groq' | 'claude' | 'gemini' | 'both'>('groq');
  const [groqModel, setGroqModel] = useState<string>('llama-3.3-70b-versatile');
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<{ success: boolean; generatedCount?: number; error?: string } | null>(null);

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
      }
    } catch (e) {
      console.error('Failed to fetch leads:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const filteredLeads = leads.filter((l) => {
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

  const validLeadIds = filteredLeads.filter((l) => l.has_valid_email).map((l) => l.id);

  const toggleSelectAll = () => {
    if (selectedIds.length === validLeadIds.length && validLeadIds.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(validLeadIds);
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleGenerateDrafts = async () => {
    if (selectedIds.length === 0) return;

    setGenerating(true);
    setGenResult(null);

    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();

      const res = await fetch('/api/drafts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          leadIds: selectedIds,
          provider: aiProvider,
          groqModel,
          userId: session?.user?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate drafts');
      }

      setGenResult({ success: true, generatedCount: data.generatedCount });
      fetchLeads();
    } catch (err: any) {
      setGenResult({ success: false, error: err?.message || 'Failed to generate AI drafts' });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-blue-400" /> Leads & Outreach Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse leads, filter by experience & contact type, and queue sequential AI email drafting.
          </p>
        </div>

        {selectedIds.length > 0 && (
          <button
            onClick={() => setModalOpen(true)}
            id="btn-open-generate-modal"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all"
          >
            <Sparkles className="w-4 h-4 text-cyan-300" /> Queue AI Drafts for {selectedIds.length} Leads
          </button>
        )}
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
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Experience Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300">
            <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold text-slate-400">Exp:</span>
            <select
              value={expFilter}
              onChange={(e) => setExpFilter(e.target.value)}
              className="bg-transparent text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All Experience</option>
              <option value="0-1" className="bg-slate-900">0 - 1 Years</option>
              <option value="1-3" className="bg-slate-900">1 - 3 Years</option>
              <option value="3-5" className="bg-slate-900">3 - 5 Years</option>
              <option value="5+" className="bg-slate-900">5+ Years</option>
            </select>
          </div>

          {/* Contact Type Filter */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex text-xs font-medium">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                filterType === 'all' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({leads.length})
            </button>
            <button
              onClick={() => setFilterType('valid')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                filterType === 'valid' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Email Ready ({leads.filter((l) => l.has_valid_email).length})
            </button>
            <button
              onClick={() => setFilterType('url')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                filterType === 'url' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Apply Links ({leads.filter((l) => !l.has_valid_email).length})
            </button>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-4 w-10 text-center">
                  <button onClick={toggleSelectAll} className="text-slate-400 hover:text-white">
                    {selectedIds.length > 0 && selectedIds.length === validLeadIds.length ? (
                      <CheckSquare className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-4">Company</th>
                <th className="p-4">Required Skills</th>
                <th className="p-4">Exp & Salary</th>
                <th className="p-4">Contact / Link</th>
                <th className="p-4 text-center">Draft Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto mb-2" />
                    Loading leads database...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 italic">
                    No leads found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const isSelected = selectedIds.includes(lead.id);

                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-blue-950/20' : ''
                      }`}
                    >
                      <td className="p-4 text-center">
                        {lead.has_valid_email ? (
                          <button
                            onClick={() => toggleSelectOne(lead.id)}
                            className="text-slate-400 hover:text-white"
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

                      <td className="p-4">
                        <p className="font-bold text-slate-100 text-sm">{lead.company}</p>
                        <p className="text-[11px] text-slate-400">{lead.location || 'Location unspecified'}</p>
                      </td>

                      <td className="p-4 max-w-xs">
                        <p className="truncate text-slate-300" title={lead.key_skills || ''}>
                          {lead.key_skills || 'N/A'}
                        </p>
                      </td>

                      <td className="p-4">
                        <p className="text-slate-300 font-semibold text-emerald-400">
                          {lead.experience ? `${lead.experience}` : 'Exp N/A'}
                        </p>
                        <p className="text-[11px] text-slate-400">{lead.salary || 'Salary N/A'}</p>
                      </td>

                      <td className="p-4">
                        {lead.has_valid_email && lead.email ? (
                          <div className="flex items-center gap-1.5 text-emerald-400 font-mono">
                            <Mail className="w-3.5 h-3.5" />
                            <span>{lead.email}</span>
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

                      <td className="p-4 text-center">
                        {lead.draftStatus ? (
                          <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[10px] font-semibold">
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

      {/* AI Draft Generation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Bot className="w-6 h-6 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">Queue Sequential AI Drafts</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Generate AI outreach drafts for <strong className="text-white">{selectedIds.length} selected leads</strong> using a sequential rate-limit queue.
            </p>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300">Select AI Model Provider:</label>

              <div className="space-y-2">
                {/* Groq AI Option */}
                <label className={`p-3.5 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all ${
                  aiProvider === 'groq' ? 'bg-indigo-950/50 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}>
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
                        <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Recommended)</option>
                        <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Ultra Fast)</option>
                        <option value="groq/compound">groq/compound</option>
                        <option value="groq/compound-mini">groq/compound-mini</option>
                      </select>
                    </div>
                  )}
                </label>

                {/* Claude Haiku 4.5 Option */}
                <label className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  aiProvider === 'claude' ? 'bg-indigo-950/50 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}>
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
                      <p className="text-[10px] text-slate-400">claude-haiku-4-5-20251001 model</p>
                    </div>
                  </div>
                </label>

                {/* Gemini Option */}
                <label className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  aiProvider === 'gemini' ? 'bg-indigo-950/50 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="provider"
                      checked={aiProvider === 'gemini'}
                      onChange={() => setAiProvider('gemini')}
                      className="accent-indigo-500"
                    />
                    <div>
                      <p className="text-xs font-semibold">Google Gemini 1.5 Flash</p>
                      <p className="text-[10px] text-slate-400">Structured JSON email generation</p>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {genResult && (
              <div className={`p-3.5 rounded-xl text-xs ${
                genResult.success ? 'bg-emerald-950/50 border border-emerald-800 text-emerald-300' : 'bg-red-950/50 border border-red-800 text-red-300'
              }`}>
                {genResult.success ? (
                  <p className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Generated {genResult.generatedCount} drafts sequentially!
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-red-400" /> {genResult.error}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              {genResult?.success ? (
                <Link
                  href="/review"
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold text-center shadow-lg shadow-emerald-600/30 transition-all"
                >
                  Open Draft Review Queue →
                </Link>
              ) : (
                <>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateDrafts}
                    disabled={generating}
                    id="btn-confirm-generate-drafts"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Processing Queue...
                      </>
                    ) : (
                      'Start AI Sequential Queue'
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
