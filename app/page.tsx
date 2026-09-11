import Link from 'next/link';
import { Users, FileSpreadsheet, FileText, MailCheck, Send, Sparkles, ShieldCheck } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase-server';

export const revalidate = 0;

export default async function HomePage() {
  const supabase = createAdminClient();

  const [{ count: totalLeads }, { count: validEmails }, { count: totalDrafts }, { count: sentEmails }] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('has_valid_email', true),
    supabase.from('email_drafts').select('*', { count: 'exact', head: true }),
    supabase.from('email_drafts').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-8 shadow-2xl">
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
            <Sparkles className="w-4 h-4" /> Personal Outreach Platform
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Automate AI Cold Emails with <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">100% Manual Control</span>
          </h1>
          <p className="text-slate-400 max-w-2xl text-base leading-relaxed">
            Import Excel leads, parse PDF resumes, generate personalized cold outreach emails using Claude or Gemini AI, edit in real-time, and approve emails one-by-one.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/import"
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-sm shadow-lg shadow-blue-600/30 hover:from-blue-500 hover:to-indigo-500 transition-all flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" /> Import Daily Excel Sheet
            </Link>
            <Link
              href="/review"
              className="px-5 py-3 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700/80 font-medium text-sm transition-all flex items-center gap-2"
            >
              <MailCheck className="w-4 h-4 text-cyan-400" /> Review & Send Queue
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Leads</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-white">{totalLeads || 0}</p>
          <p className="text-xs text-slate-500">{validEmails || 0} with direct email</p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>AI Drafts Ready</span>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-3xl font-bold text-white">{totalDrafts || 0}</p>
          <p className="text-xs text-slate-500">Claude & Gemini generated</p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Emails Sent</span>
            <Send className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-emerald-400">{sentEmails || 0}</p>
          <p className="text-xs text-slate-500">Dispatched via Nodemailer</p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Safety Mode</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-xl font-bold text-cyan-400">Strict Manual</p>
          <p className="text-xs text-slate-500">100% per-email approval</p>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/import"
          className="group p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition-all duration-200 space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">1. Import Excel Leads</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Upload daily lead spreadsheets. Automatically normalizes columns, splits multi-email cells, and extracts job portal URLs.
          </p>
        </Link>

        <Link
          href="/resume"
          className="group p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all duration-200 space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-white group-hover:text-indigo-400 transition-colors">2. Upload Resume PDF</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Upload your latest resume PDF. Text is extracted for AI matching context, and PDF is attached to outgoing emails.
          </p>
        </Link>

        <Link
          href="/review"
          className="group p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all duration-200 space-y-3"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <MailCheck className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-white group-hover:text-emerald-400 transition-colors">3. Review & Approve Send</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Review personalized Claude/Gemini email drafts, edit subject & body, and click Approve & Send to fire via SMTP.
          </p>
        </Link>
      </div>
    </div>
  );
}
