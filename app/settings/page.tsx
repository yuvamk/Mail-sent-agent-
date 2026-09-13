'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import {
  Settings,
  Save,
  Key,
  Mail,
  User,
  CheckCircle2,
  Loader2,
  Sparkles,
  Server,
  Bot,
  Globe,
  RotateCcw,
  Eye,
  EyeOff,
  Radio,
  ExternalLink,
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dynamic Prompt & Profile state
  const [customPrompt, setCustomPrompt] = useState('');
  const [defaultTemplate, setDefaultTemplate] = useState('');

  const [candidateName, setCandidateName] = useState('');
  const [candidatePhone, setCandidatePhone] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  // Credentials State
  const [anthropicKey, setAnthropicKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [brevoApiKey, setBrevoApiKey] = useState('');

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        const res = await fetch(`/api/settings?userId=${session.user.id}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (res.ok) {
          const data = await res.json();
          const s = data.settings || {};
          setCustomPrompt(s.CUSTOM_SYSTEM_PROMPT || s.DEFAULT_PROMPT_TEMPLATE || '');
          setDefaultTemplate(s.DEFAULT_PROMPT_TEMPLATE || '');
          setCandidateName(s.MY_NAME || '');
          setCandidatePhone(s.MY_PHONE || '');
          setGithubUrl(s.MY_GITHUB || '');
          setLinkedinUrl(s.MY_LINKEDIN || '');
          setAnthropicKey(s.ANTHROPIC_API_KEY || '');
          setGeminiKey(s.GEMINI_API_KEY || '');
          setGroqKey(s.GROQ_API_KEY || '');
          setSmtpHost(s.SMTP_HOST || '');
          setSmtpPort(s.SMTP_PORT || '587');
          setSmtpUser(s.SMTP_USER || '');
          setSmtpPass(s.SMTP_PASS || '');
          setSmtpFrom(s.SMTP_FROM_EMAIL || '');
          setBrevoApiKey(s.BREVO_API_KEY || '');
        }
      } catch (e) {
        console.error('Failed to load settings:', e);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();

      if (!session?.user?.id) {
        setMessage({ type: 'error', text: 'Session expired or not found. Please log in again.' });
        router.push('/login');
        return;
      }

      const payload = {
        user_id: session.user.id,
        custom_system_prompt: customPrompt,
        candidate_name: candidateName,
        candidate_phone: candidatePhone,
        github_url: githubUrl,
        linkedin_url: linkedinUrl,
        anthropic_api_key: anthropicKey,
        gemini_api_key: geminiKey,
        groq_api_key: groqKey,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_user: smtpUser,
        smtp_pass: smtpPass,
        smtp_from_email: smtpFrom,
        brevo_api_key: brevoApiKey,
        updated_at: new Date().toISOString(),
      };

      let saved = false;
      let lastErrorMessage = '';

      // Primary Channel: Server API endpoint
      try {
        const res = await fetch(`/api/settings?userId=${session.user.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token || ''}`,
            'x-user-id': session.user.id,
          },
          body: JSON.stringify({
            userId: session.user.id,
            CUSTOM_SYSTEM_PROMPT: customPrompt,
            MY_NAME: candidateName,
            MY_PHONE: candidatePhone,
            MY_GITHUB: githubUrl,
            MY_LINKEDIN: linkedinUrl,
            ANTHROPIC_API_KEY: anthropicKey,
            GEMINI_API_KEY: geminiKey,
            GROQ_API_KEY: groqKey,
            SMTP_HOST: smtpHost,
            SMTP_PORT: smtpPort,
            SMTP_USER: smtpUser,
            SMTP_PASS: smtpPass,
            SMTP_FROM_EMAIL: smtpFrom,
            BREVO_API_KEY: brevoApiKey,
          }),
        });

        const resData = await res.json();
        if (res.ok && resData.success) {
          saved = true;
        } else {
          lastErrorMessage = resData.error || 'Server error';
          console.warn('API save returned non-ok, initiating direct client fallback:', lastErrorMessage);
        }
      } catch (apiErr: any) {
        lastErrorMessage = apiErr?.message || 'Network error';
        console.warn('API save fetch threw error, initiating direct client fallback:', apiErr);
      }

      // Secondary Channel: Direct Supabase Client Fallback (guarantees saving even if server environment lacks service key)
      if (!saved) {
        const { error: directErr } = await supabaseBrowser
          .from('user_settings')
          .upsert(payload, { onConflict: 'user_id' });

        if (!directErr) {
          saved = true;
        } else {
          throw new Error(directErr.message || lastErrorMessage);
        }
      }

      setMessage({ type: 'success', text: 'Dynamic prompt & credentials saved successfully to database!' });
    } catch (e: any) {
      console.error('Save error:', e);
      setMessage({ type: 'error', text: e?.message || 'Error saving settings to database.' });
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (preset: 'short' | 'formal' | 'recruiter' | 'default') => {
    if (preset === 'short') {
      setCustomPrompt(`Write an ultra-short, high-impact cold outreach email (2 short paragraphs max).
Focus on immediate value matching my candidate resume skills to the lead requirements.
Output ONLY valid JSON with keys "subject" and "body".`);
    } else if (preset === 'formal') {
      setCustomPrompt(`Write a formal, highly structured cold outreach application.
Include bullet points highlighting 3 key technical accomplishments from my resume.
Output ONLY valid JSON with keys "subject" and "body".`);
    } else if (preset === 'recruiter') {
      setCustomPrompt(`Write a warm, conversational email to a tech recruiter.
Express interest in open engineering roles at their firm and highlight matching skills.
Output ONLY valid JSON with keys "subject" and "body".`);
    } else {
      setCustomPrompt(defaultTemplate);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <Settings className="w-7 h-7 text-indigo-600" /> Settings & Dynamic Prompt Studio
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Customize your personal AI outreach email generation prompt, API keys, SMTP credentials, and portfolio links.
        </p>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" /> Loading your settings...
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section 1: Dynamic Custom System Prompt Editor */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-indigo-600" /> Dynamic AI System Prompt Editor
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Change how Claude & Gemini generate your emails. You tell the AI exactly how to write!
                </p>
              </div>

              {/* Template Presets */}
              <div className="flex flex-wrap gap-1.5 text-xs">
                <button
                  onClick={() => applyPreset('short')}
                  className="px-2.5 py-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 text-[11px] font-semibold transition-colors"
                >
                  Ultra-Short
                </button>
                <button
                  onClick={() => applyPreset('formal')}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-[11px] font-semibold transition-colors"
                >
                  Formal + Bullets
                </button>
                <button
                  onClick={() => applyPreset('recruiter')}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-semibold transition-colors"
                >
                  Recruiter Warm
                </button>
                <button
                  onClick={() => applyPreset('default')}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px] font-semibold transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Default
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Custom System Prompt Instructions:</label>
              <textarea
                rows={7}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Write instructions for the AI on how to draft your cold emails..."
                className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono leading-relaxed focus:bg-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <p className="text-[11px] text-slate-500 italic">
                Note: Ensure your custom prompt instructs the AI to return valid JSON with keys &quot;subject&quot; and &quot;body&quot;.
              </p>
            </div>
          </div>

          {/* Section 2: Candidate Profile & Signature */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <User className="w-4 h-4 text-blue-600" /> Personal Candidate Profile & Links
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Full Name (Signature):</label>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="e.g. Alex Smith"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Phone Number:</label>
                <input
                  type="text"
                  value={candidatePhone}
                  onChange={(e) => setCandidatePhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">GitHub Profile URL:</label>
                <input
                  type="text"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/yourusername"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-sm focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">LinkedIn Profile URL:</label>
                <input
                  type="text"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/in/yourusername"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-sm focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Dynamic AI API Keys */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-600" /> Per-User AI API Keys (Claude, Gemini & Groq)
              </h2>

              <button
                type="button"
                onClick={() => setShowKeys(!showKeys)}
                className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {showKeys ? <EyeOff className="w-3.5 h-3.5 text-cyan-600" /> : <Eye className="w-3.5 h-3.5 text-cyan-600" />}
                {showKeys ? 'Hide Keys' : 'Show Keys'}
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Enter your personal API keys below. They are saved securely to your database workspace and used dynamically whenever you generate email drafts.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 flex items-center justify-between">
                  <span>Anthropic Claude Key:</span>
                  <span className="text-[10px] text-slate-500 font-mono">claude-haiku-4-5</span>
                </label>
                <input
                  type={showKeys ? 'text' : 'password'}
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-api03-..."
                  id="input-claude-api-key"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-sm focus:bg-white focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 flex items-center justify-between">
                  <span>Google Gemini Key:</span>
                  <span className="text-[10px] text-slate-500 font-mono">gemini-flash-latest</span>
                </label>
                <input
                  type={showKeys ? 'text' : 'password'}
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  id="input-gemini-api-key"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-sm focus:bg-white focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5 p-3.5 rounded-xl bg-cyan-50/70 border border-cyan-200">
                <label className="font-bold text-cyan-900 flex items-center justify-between">
                  <span>Groq Cloud API Key:</span>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-600 text-white text-[10px] font-mono font-semibold">POOL</span>
                </label>
                <input
                  type={showKeys ? 'text' : 'password'}
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  placeholder="gsk_..."
                  id="input-groq-api-key"
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-cyan-300 text-slate-900 font-mono text-sm focus:outline-none focus:border-cyan-600 shadow-sm"
                />
                <p className="text-[10px] text-cyan-800 leading-tight">
                  Multi-Key Pool Active: Automatically rotates and load-balances across all 3 Groq keys if any key hits rate limits.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Dynamic SMTP Server Credentials */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Server className="w-4 h-4 text-emerald-600" /> Per-User SMTP Server Settings (Brevo / Gmail)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">SMTP Server Host:</label>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp-relay.brevo.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-sm focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">SMTP Port:</label>
                <input
                  type="text"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  placeholder="587"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-sm focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">SMTP Username:</label>
                <input
                  type="text"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="b8decd001@smtp-brevo.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-sm focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">SMTP Password:</label>
                <input
                  type="password"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  placeholder="xsmtpsib-..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-sm focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="font-semibold text-slate-700">Sender Email Address (From):</label>
                <input
                  type="text"
                  value={smtpFrom}
                  onChange={(e) => setSmtpFrom(e.target.value)}
                  placeholder="yuvamk6@gmail.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-sm focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Brevo REST API Key (Delivery, Bounce & Open Tracking) */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Radio className="w-4 h-4 text-purple-600" /> Brevo REST API Key (Delivery, Bounce &amp; Open Tracking)
              </h2>
              <a
                href="https://app.brevo.com/settings/keys/api"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-purple-600 hover:text-purple-700 font-semibold underline flex items-center gap-1"
              >
                Get Key in Brevo <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-2 text-xs">
              <label className="font-semibold text-slate-700">
                Brevo REST API Key (<code className="text-purple-700 font-mono font-semibold">xkeysib-...</code>):
              </label>
              <input
                type="password"
                value={brevoApiKey}
                onChange={(e) => setBrevoApiKey(e.target.value)}
                placeholder="xkeysib-3bf19a3c0e32b8f913e4ed4b332a997d6..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-sm focus:bg-white focus:outline-none focus:border-purple-500 transition-colors"
              />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                This key allows ReachOut AI to automatically query Brevo to track which emails are delivered, which bounced, and which were opened by recruiters. Notice: this is different from the SMTP relay password (<code className="text-slate-600 font-mono">xsmtpsib-...</code>).
              </p>
            </div>
          </div>

          {/* Feedback Alert */}
          {message && (
            <div
              className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{message.text}</span>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              id="btn-save-settings"
              className="px-7 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Dynamic Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
