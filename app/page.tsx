'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';
import {
  Sparkles,
  Zap,
  ShieldCheck,
  ArrowRight,
  FileSpreadsheet,
  FileText,
  MailCheck,
  Send,
  Coins,
  Cpu,
  Lock,
  Bot,
  Users,
  CheckCircle2,
  ChevronRight,
  Globe,
  SlidersHorizontal,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsLoggedIn(true);
        setUserEmail(session.user.email || null);
      }
    });

    const { data: authListener } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsLoggedIn(true);
        setUserEmail(session.user.email || null);
      } else {
        setIsLoggedIn(false);
        setUserEmail(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 space-y-20 pb-16 overflow-hidden">
      {/* Background Animated Gradient Blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-cyan-500/10 via-blue-600/10 to-transparent blur-3xl pointer-events-none -z-10 animate-pulse" />

      {/* Hero Section */}
      <section className="pt-8 max-w-6xl mx-auto text-center space-y-8 px-4">
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/90 border border-cyan-500/30 text-cyan-300 text-xs font-semibold shadow-lg shadow-cyan-500/10 animate-bounce">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Next-Gen Multi-Tenant AI Cold Outreach Platform</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Supercharge Job Applications with <br className="hidden sm:inline" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 drop-shadow-sm">
            Groq, Claude & Gemini AI
          </span>
        </h1>

        <p className="max-w-3xl mx-auto text-slate-400 text-base sm:text-lg leading-relaxed font-normal">
          Upload any Excel sheet layout without fixed schemas. Extract leads, parse PDF resumes, generate hyper-tailored outreach emails using <strong className="text-slate-200">Llama 3.3 70B</strong> or <strong className="text-slate-200">Claude Haiku</strong>, and track exact token costs in <strong className="text-emerald-400">Rupees (₹)</strong>.
        </p>

        {/* CTA Button Bar */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          {isLoggedIn ? (
            <Link
              href="/leads"
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-cyan-500/25 flex items-center gap-3 transition-all transform hover:-translate-y-0.5"
            >
              <Zap className="w-5 h-5 text-cyan-200 fill-cyan-200" /> Launch Workspace ({userEmail})
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/signup"
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold text-sm shadow-xl shadow-cyan-500/25 flex items-center gap-3 transition-all transform hover:-translate-y-0.5"
              >
                <Sparkles className="w-5 h-5" /> Create Private Account Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="px-7 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-sm flex items-center gap-2 transition-all"
              >
                Sign In to Workspace
              </Link>
            </>
          )}
        </div>

        {/* Live Safety Guarantee Pill */}
        <div className="flex items-center justify-center gap-6 text-xs text-slate-400 pt-2 font-mono">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <ShieldCheck className="w-4 h-4" /> Strict Manual Approval
          </span>
          <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
            <Lock className="w-4 h-4" /> Isolated Postgres RLS Data
          </span>
        </div>
      </section>

      {/* Interactive Platform Mockup Card */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-xs font-mono text-slate-400 ml-2">reachout-ai-workspace.app</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Multi-Tenant RLS Active
              </span>
            </div>
          </div>

          {/* Workflow Steps Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 hover:border-cyan-500/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-cyan-400 font-mono">Step 01</span>
                <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
              </div>
              <h3 className="text-xs font-bold text-white">Schema-Less Excel</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Upload any `.xlsx` format. Dynamic columns stored in Postgres `raw_data jsonb`.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 hover:border-blue-500/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-blue-400 font-mono">Step 02</span>
                <Bot className="w-4 h-4 text-blue-400" />
              </div>
              <h3 className="text-xs font-bold text-white">Groq / Claude AI</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Generates personalized cold emails matching resume text to lead criteria.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 hover:border-indigo-500/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-indigo-400 font-mono">Step 03</span>
                <Coins className="w-4 h-4 text-indigo-400" />
              </div>
              <h3 className="text-xs font-bold text-white">₹ Token Analytics</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Live cost calculation in Indian Rupees (₹) per email generated.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 hover:border-emerald-500/50 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-emerald-400 font-mono">Step 04</span>
                <Send className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-xs font-bold text-white">1-Click Batch Send</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Send 1-by-1 or batch dispatch all approved emails via Nodemailer with attached PDF.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="max-w-6xl mx-auto px-4 space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Built for Modern Job Seekers & High-Volume Outreach
          </h2>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            Everything you need to automate personalized applications with zero data leakage and 100% control.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 hover:border-cyan-500/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Isolated Multi-Tenant RLS</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every user gets a private workspace. Database row-level security (RLS) ensures your leads, resumes, API keys, and sent emails are completely private.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 hover:border-blue-500/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Groq & Multi-Model Engine</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Choose between Groq Llama 3.3 70B, Claude Haiku 4.5, or Gemini 1.5 Flash. Switch models per lead with one click.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 hover:border-indigo-500/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Coins className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Rupee (₹) Token Analytics</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Transparent cost metrics. View input/output token counts, today&apos;s spend, monthly spend, and exact cost in Rupees per email generated.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 hover:border-emerald-500/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Dynamic AI System Prompts</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              You control how the AI drafts emails. Customize prompt instructions with 1-click presets (*Ultra-Short*, *Formal*, *Recruiter Warm*).
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 hover:border-amber-500/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">100% Dynamic Excel Upload</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              No static database schemas. Upload any spreadsheet format; custom columns are saved into JSONB and passed directly to the AI prompt.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 hover:border-purple-500/50 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Send className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Sequential Queue & Send All</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Rate-limit protected sequential draft queueing with batch email dispatching via Nodemailer with attached PDF resumes.
            </p>
          </div>
        </div>
      </section>

      {/* Live Cost Estimation Card */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-500/30 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-cyan-400" /> Token Cost Transparency (₹ / Email)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Estimated average generation costs based on live 1 USD = 86.5 INR conversion rate.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-mono font-bold">
              Groq & Claude Powered
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-mono">10 Emails</span>
              <p className="text-xl font-bold text-emerald-400">~ ₹ 0.42</p>
              <p className="text-[10px] text-slate-500">Total API cost</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-mono">50 Emails</span>
              <p className="text-xl font-bold text-emerald-400">~ ₹ 2.10</p>
              <p className="text-[10px] text-slate-500">Total API cost</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-mono">100 Emails</span>
              <p className="text-xl font-bold text-emerald-400">~ ₹ 4.20</p>
              <p className="text-[10px] text-slate-500">Total API cost</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-mono">500 Emails</span>
              <p className="text-xl font-bold text-emerald-400">~ ₹ 21.00</p>
              <p className="text-[10px] text-slate-500">Total API cost</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="p-10 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-center space-y-6 shadow-2xl">
          <h2 className="text-3xl font-extrabold text-white">
            Ready to Automate Your Job Outreach?
          </h2>
          <p className="text-cyan-100 max-w-xl mx-auto text-sm leading-relaxed">
            Create your isolated multi-tenant workspace account now and start sending high-impact cold emails.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-2">
            {isLoggedIn ? (
              <Link
                href="/leads"
                className="px-8 py-3.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-sm shadow-xl flex items-center gap-2 transition-all"
              >
                Go to Workspace Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href="/signup"
                className="px-8 py-3.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-sm shadow-xl flex items-center gap-2 transition-all"
              >
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 pt-8 border-t border-slate-900 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-slate-300">ReachOut AI</span> — Multi-Tenant Job Outreach Platform
        </div>
        <div>
          <span>Crafted with Next.js, Supabase & Groq AI</span>
        </div>
      </footer>
    </div>
  );
}
