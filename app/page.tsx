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
  Linkedin,
  Newspaper,
  Eye,
  RefreshCw,
  Layers,
  Check,
  ExternalLink,
  HelpCircle,
  Laptop,
  ImageIcon,
  Flame,
  Key,
} from 'lucide-react';

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

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

  const faqs = [
    {
      q: 'Does ReachOut AI post to LinkedIn automatically or do I review first?',
      a: 'You have 100% control with our strict Human-in-the-Loop review system. The AI scans live news, drafts the post, and designs matched imagery. You can edit any sentence, switch between 4 visual styles, and preview the authentic mobile/desktop mockup before clicking "Approve & Post".',
    },
    {
      q: 'How does the Google Gemini 3-Key Auto-Rotation pool work?',
      a: 'Google free-tier keys allow 15 requests per minute. We pool 3 Gemini API keys with round-robin load distribution. If one key experiences rate limits (429) or transient demand spikes (503), the engine automatically fails over to the next key with zero downtime.',
    },
    {
      q: 'How does the image generator match the exact lines of my post?',
      a: 'Unlike generic text-to-image tools that only take a high-level title, Google Gemini analyzes the complete draft copy, technical arguments, and metaphors to formulate a custom photo-editorial prompt. It then generates 3 distinct high-res styles: Photo-Editorial, 3D Isometric, and Tech Vector.',
    },
    {
      q: 'Can I upload any Excel spreadsheet format for job applications?',
      a: 'Yes! ReachOut AI is 100% schema-less. You do not need to rename columns to fit a rigid database schema. Upload any .xlsx or .csv sheet; arbitrary columns (e.g., Company, Salary, Location, Skills, Recruiter Name) are stored dynamically in Postgres JSONB and mapped to AI prompts.',
    },
    {
      q: 'How are token costs tracked in Indian Rupees (₹)?',
      a: 'Every draft generation calculates prompt tokens, candidate tokens, and model pricing in real-time. We convert live USD pricing to Indian Rupees (₹) so you always know your exact spend down to the paise (e.g. ~₹0.04 per cold email).',
    },
    {
      q: 'Is my data and LinkedIn account private?',
      a: 'Completely private. We use Supabase PostgreSQL Row Level Security (RLS) which guarantees your leads, resumes, drafts, and tokens are isolated to your workspace and inaccessible to any other user.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 space-y-24 pb-20 overflow-hidden font-sans">
      {/* Background Animated Gradient Blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-cyan-500/15 via-blue-600/10 to-transparent blur-3xl pointer-events-none -z-10 animate-pulse" />

      {/* ========================================================================= */}
      {/* HERO SECTION */}
      {/* ========================================================================= */}
      <section className="pt-10 max-w-6xl mx-auto text-center space-y-8 px-4 relative">
        {/* Animated Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 text-cyan-300 text-xs font-semibold shadow-lg shadow-cyan-500/10">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>The Autonomous AI Career & Thought Leadership Platform</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.1]">
          Research, Draft & Publish <br className="hidden sm:inline" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 drop-shadow-sm">
            Viral Tech Insights & Job Outreach
          </span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-3xl mx-auto text-slate-300 text-base sm:text-lg leading-relaxed font-normal">
          A dual-engine platform designed for modern tech builders: Harvest <strong className="text-white">real-time AI news</strong>, generate <strong className="text-cyan-300">post-line matched Gemini visuals</strong>, and publish directly to <strong className="text-blue-400">LinkedIn</strong> — or upload schema-less spreadsheets to send <strong className="text-emerald-400">hyper-tailored cold outreach emails</strong> at ₹0.04/email.
        </p>

        {/* Action Button Bar */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/linkedin"
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-sm shadow-xl shadow-blue-500/25 flex items-center gap-3 transition-all transform hover:-translate-y-0.5"
          >
            <Linkedin className="w-5 h-5 fill-current" /> Launch LinkedIn Studio Free
            <ArrowRight className="w-4 h-4" />
          </Link>

          {isLoggedIn ? (
            <Link
              href="/leads"
              className="px-7 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-sm flex items-center gap-2 transition-all"
            >
              <Zap className="w-4 h-4 text-cyan-400" /> Go to Workspace ({userEmail})
            </Link>
          ) : (
            <Link
              href="/signup"
              className="px-7 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-sm flex items-center gap-2 transition-all"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" /> Create Account Free
            </Link>
          )}
        </div>

        {/* Proof Points Strip */}
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-slate-400 pt-4 font-mono">
          <span className="flex items-center gap-2 text-cyan-300 font-semibold">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            Google Gemini 3-Key Rotation Pool
          </span>
          <span className="flex items-center gap-2 text-emerald-300 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Direct 1-Click LinkedIn Publishing
          </span>
          <span className="flex items-center gap-2 text-indigo-300 font-semibold">
            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
            Live TechCrunch, arXiv & HN Radar
          </span>
        </div>

        {/* HERO IMAGE SHOWCASE */}
        <div className="pt-6 max-w-5xl mx-auto">
          <div className="rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-cyan-500/30 via-slate-800 to-slate-900 shadow-2xl shadow-cyan-500/20 border border-cyan-500/40 relative group">
            <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 relative">
              <img
                src="/images/hero-preview.jpg"
                alt="ReachOut AI Unified Platform Dashboard"
                className="w-full h-auto object-cover transform group-hover:scale-[1.01] transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-30"></div>
            </div>

            {/* Floating Metric Badges over the Image */}
            <div className="absolute -bottom-5 left-8 hidden sm:flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700 shadow-xl backdrop-blur-md">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                ₹
              </div>
              <div className="text-left text-xs">
                <span className="text-slate-400 text-[10px]">Avg. Cold Outreach Cost</span>
                <p className="font-bold text-white">₹ 0.04 / email</p>
              </div>
            </div>

            <div className="absolute -top-5 right-8 hidden sm:flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-cyan-500/40 shadow-xl backdrop-blur-md">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Flame className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-left text-xs">
                <span className="text-slate-400 text-[10px]">Live Stories Radar</span>
                <p className="font-bold text-cyan-300">25+ Tech Articles Daily</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* PILLAR 1: LINKEDIN AI THOUGHT LEADERSHIP STUDIO */}
      {/* ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 space-y-12 pt-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/30">
            <Linkedin className="w-3.5 h-3.5" /> Flagship Feature #1
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            LinkedIn AI Thought Leadership & News Radar
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            Stop staring at a blank screen. ReachOut AI monitors cutting-edge tech breakthroughs and crafts insight-dense LinkedIn posts with custom visuals tailored to your exact lines.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Feature List (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 hover:border-blue-500/50 transition-all">
              <div className="flex items-center gap-2.5 text-blue-400 font-bold text-sm">
                <Newspaper className="w-4 h-4" />
                <span>Multi-Source Tech News Harvester</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Live breaking stories gathered across <strong>TechCrunch AI</strong>, <strong>arXiv AI research papers</strong>, <strong>Hacker News</strong>, and <strong>Google News RSS</strong>. Filtered by category with cleaned editorial summaries.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 hover:border-cyan-500/50 transition-all">
              <div className="flex items-center gap-2.5 text-cyan-400 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Gemini Post-Line Matched Visuals</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Google Gemini reads the exact lines, hook, and technical takeaways inside your post to direct photographic imagery. Switch between <strong>Photo-Editorial</strong>, <strong>3D Isometric</strong>, and <strong>Tech Vector</strong> in 1 click.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 hover:border-emerald-500/50 transition-all">
              <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Direct 1-Click Publishing to Feed</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Authentic live desktop/mobile preview card. Connect your LinkedIn OAuth token once, review your draft, and publish directly to your feed without ever leaving the studio.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/linkedin"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all"
              >
                Try the LinkedIn Studio Now <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Feature Showcase Image (7 cols) */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl p-2 bg-gradient-to-tr from-blue-600/30 via-slate-800 to-cyan-500/30 border border-blue-500/40 shadow-2xl relative group">
              <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
                <img
                  src="/images/linkedin-studio.jpg"
                  alt="LinkedIn Thought Leadership Studio Preview"
                  className="w-full h-auto object-cover transform group-hover:scale-[1.01] transition-transform duration-500"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* PILLAR 2: AUTOMATED MULTI-TENANT COLD OUTREACH ENGINE */}
      {/* ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 space-y-12 pt-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/30">
            <Send className="w-3.5 h-3.5" /> Flagship Feature #2
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Intelligent Cold Outreach & Resume Matcher
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            Upload any spreadsheet of job leads. Let AI extract your core technical strengths from your resume PDF and craft customized emails that recruiters actually respond to.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Feature Showcase Image (7 cols) */}
          <div className="lg:col-span-7 order-2 lg:order-1">
            <div className="rounded-3xl p-2 bg-gradient-to-tr from-emerald-600/30 via-slate-800 to-blue-500/30 border border-emerald-500/40 shadow-2xl relative group">
              <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
                <img
                  src="/images/cold-outreach.jpg"
                  alt="Cold Outreach and Resume Matching Engine"
                  className="w-full h-auto object-cover transform group-hover:scale-[1.01] transition-transform duration-500"
                />
              </div>
            </div>
          </div>

          {/* Feature List (5 cols) */}
          <div className="lg:col-span-5 space-y-5 order-1 lg:order-2">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 hover:border-emerald-500/50 transition-all">
              <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Schema-Less Excel & CSV Ingestion</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Drop in any recruiter spreadsheet. Any custom column (*Role, Experience, Tech Stack, Notes*) is saved in Postgres JSONB and directly supplied to AI system prompts.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 hover:border-cyan-500/50 transition-all">
              <div className="flex items-center gap-2.5 text-cyan-400 font-bold text-sm">
                <FileText className="w-4 h-4" />
                <span>Resume PDF Deep Skill Extraction</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Extracts your key projects, tech stack, and accomplishments from your PDF. The AI links specific job requirements to real proof points from your resume.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 hover:border-indigo-500/50 transition-all">
              <div className="flex items-center gap-2.5 text-indigo-400 font-bold text-sm">
                <Coins className="w-4 h-4" />
                <span>Token Billing Transparent in Rupees (₹)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Live cost tracking for every single generated email based on exact token usage. Compare expenses across Groq, Gemini, and Claude in real-time.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/import"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all"
              >
                Import Leads Spreadsheet <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* ARCHITECTURE & MODEL ENGINE COMPARISON */}
      {/* ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 space-y-8 pt-8">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Multi-Model AI Infrastructure Built for Resilience
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Choose the best AI model for each specific task. Switch anytime with zero configuration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Gemini Flash */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-cyan-500/40 space-y-5 shadow-xl relative overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base">Google Gemini Flash</h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  gemini-flash-latest
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Our primary engine for news research and LinkedIn thought leadership. Automatically rotates across a 3-key pool for zero rate limits.
              </p>
            </div>
            <ul className="text-xs text-slate-300 space-y-2 border-t border-slate-800 pt-3">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-cyan-400" /> Multi-key auto-rotation pool
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-cyan-400" /> Contextual post-line visual director
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-cyan-400" /> ~1.2s average response latency
              </li>
            </ul>
          </div>

          {/* Groq Compound */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-blue-500/30 space-y-5 shadow-xl">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base">Groq LPUs (Llama 3.3)</h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  groq/compound
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Ultra-high-speed inference on custom silicon. Ideal for batch email drafting across hundreds of recruiter leads in seconds.
              </p>
            </div>
            <ul className="text-xs text-slate-300 space-y-2 border-t border-slate-800 pt-3">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-blue-400" /> Sub-second drafting speed (&lt;0.8s)
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-blue-400" /> 3-key round-robin failover pool
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-blue-400" /> Cost-effective at high volume
              </li>
            </ul>
          </div>

          {/* Claude Haiku */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-indigo-500/30 space-y-5 shadow-xl">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base">Anthropic Claude</h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  claude-haiku-4.5
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Nuanced, highly articulate executive prose. Excels when pitching senior engineering directors, VPs, and technical founders.
              </p>
            </div>
            <ul className="text-xs text-slate-300 space-y-2 border-t border-slate-800 pt-3">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-indigo-400" /> Superior conversational warmth
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-indigo-400" /> Nuanced professional tone matching
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-indigo-400" /> Zero robotic cliches
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* LIVE TOKEN COST ESTIMATION IN RUPEES (₹) */}
      {/* ========================================================================= */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-cyan-500/30 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-cyan-400" /> Transparent Token Cost Calculations (₹)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Real-time INR conversion based on live model token pricing. Zero hidden markups.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold">
              1 USD ≈ ₹ 86.50
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-mono">10 Drafts / Posts</span>
              <p className="text-xl font-bold text-emerald-400">~ ₹ 0.42</p>
              <p className="text-[10px] text-slate-500">Less than 50 paise</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-mono">50 Drafts / Posts</span>
              <p className="text-xl font-bold text-emerald-400">~ ₹ 2.10</p>
              <p className="text-[10px] text-slate-500">Cost of a cup of chai</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-mono">100 Drafts / Posts</span>
              <p className="text-xl font-bold text-emerald-400">~ ₹ 4.20</p>
              <p className="text-[10px] text-slate-500">Full job hunt batch</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-xs text-slate-400 font-mono">500 Drafts / Posts</span>
              <p className="text-xl font-bold text-emerald-400">~ ₹ 21.00</p>
              <p className="text-[10px] text-slate-500">Massive enterprise pipeline</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* FAQ SECTION */}
      {/* ========================================================================= */}
      <section className="max-w-4xl mx-auto px-4 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-slate-400">
            Everything you need to know about publishing safety, AI keys, and spreadsheets.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          {faqs.map((faq, i) => {
            const isOpen = activeFaq === i;
            return (
              <div
                key={i}
                className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : i)}
                  className="w-full p-4 text-left flex items-center justify-between text-xs sm:text-sm font-bold text-white hover:text-cyan-300 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronRight
                    className={`w-4 h-4 text-slate-400 transform transition-transform ${
                      isOpen ? 'rotate-90 text-cyan-400' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* BOTTOM CTA BANNER */}
      {/* ========================================================================= */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="p-10 sm:p-12 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

          <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
            Ready to Accelerate Your Tech Presence?
          </h2>
          <p className="text-cyan-100 max-w-xl mx-auto text-sm leading-relaxed">
            Create thought-provoking LinkedIn posts from live research or automate your cold job applications with 100% human oversight.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Link
              href="/linkedin"
              className="px-8 py-3.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs sm:text-sm shadow-xl flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <Linkedin className="w-4 h-4 fill-current" /> Open LinkedIn Studio <ArrowRight className="w-4 h-4" />
            </Link>

            {isLoggedIn ? (
              <Link
                href="/leads"
                className="px-7 py-3.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm border border-white/30 backdrop-blur-sm transition-all"
              >
                Go to Workspace Dashboard
              </Link>
            ) : (
              <Link
                href="/signup"
                className="px-7 py-3.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm border border-white/30 backdrop-blur-sm transition-all"
              >
                Get Started Free
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* RICH FOOTER */}
      {/* ========================================================================= */}
      <footer className="max-w-6xl mx-auto px-4 pt-12 border-t border-slate-900 text-xs text-slate-500 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-slate-200">ReachOut AI</span>
              <p className="text-[11px] text-slate-400">Autonomous Tech Thought Leadership & Cold Outreach</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-slate-400">
            <Link href="/linkedin" className="hover:text-cyan-400 transition-colors">LinkedIn Studio</Link>
            <Link href="/leads" className="hover:text-cyan-400 transition-colors">Job Outreach</Link>
            <Link href="/import" className="hover:text-cyan-400 transition-colors">Excel Import</Link>
            <Link href="/analytics" className="hover:text-cyan-400 transition-colors">Token Analytics</Link>
            <Link href="/settings" className="hover:text-cyan-400 transition-colors">Settings</Link>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-900 pt-4 text-[11px]">
          <span>© 2026 ReachOut AI. Built with Next.js, Google Gemini, Groq & Supabase.</span>
          <span className="font-mono text-cyan-400/80">3-Key Auto-Rotation Engine Active</span>
        </div>
      </footer>
    </div>
  );
}
