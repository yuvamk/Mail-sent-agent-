'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
  MessageSquare,
  Repeat2,
  CheckCircle,
  Radio,
  Play,
  Share2,
  ThumbsUp,
  Terminal,
  Server,
  Activity,
  Award,
  BookOpen,
} from 'lucide-react';

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Active Hero Tab Preview
  const [activeHeroTab, setActiveHeroTab] = useState<'platform' | 'linkedin' | 'outreach'>('platform');

  // Interactive Simulator State
  const [simActiveTab, setSimActiveTab] = useState<'leads' | 'draft' | 'linkedin' | 'delivery' | 'pricing'>('draft');
  const [simModel, setSimModel] = useState<'gemini' | 'groq' | 'claude'>('gemini');
  const [simTone, setSimTone] = useState<'ultra-short' | 'warm' | 'formal'>('warm');
  const [simEmailCount, setSimEmailCount] = useState<number>(350);
  const [simPublished, setSimPublished] = useState(false);
  const [simLinkedinTone, setSimLinkedinTone] = useState<'thought-leader' | 'technical'>('thought-leader');

  // FAQ Accordion State
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

  // Simulator Email Content Preview based on Model & Tone
  const simEmailPreview = useMemo(() => {
    if (simTone === 'ultra-short') {
      return {
        subject: 'Full-Stack & LLM Engineer for Siemens - Yuvam Kumar',
        body: `Hi Alex,\n\nI noticed Siemens is scaling its AI Infrastructure team. With 3+ years building high-throughput distributed systems in Next.js 16, TypeScript, and Google Gemini multi-agent orchestration, I can immediately accelerate your pipeline.\n\nMy active projects deliver 99.9% uptime with automated rate-limit failovers. Would you be open to a brief 10-minute chat this Thursday?\n\nBest,\nYuvam Kumar | github.com/yuvamk`,
      };
    } else if (simTone === 'formal') {
      return {
        subject: 'Application for Senior AI Software Engineer - Yuvam Kumar',
        body: `Dear Hiring Team at Siemens Technology,\n\nI am writing to express my strong interest in the Senior AI Software Engineer position. Having developed production platforms utilizing Supabase Postgres RLS, asynchronous Redis/pgmq queues, and Brevo SMTP delivery with zero-rate-limit sequential processing, I am confident in my capacity to contribute immediately to Siemens' core initiatives.\n\nMy attached resume outlines my technical contributions in detail. I welcome the opportunity to discuss how my background aligns with your team's objectives.\n\nSincerely,\nYuvam Kumar | linkedin.com/in/yuvam-kumar`,
      };
    } else {
      return {
        subject: 'Quick question regarding Siemens AI stack - Yuvam',
        body: `Hey Alex,\n\nCame across Siemens' recent work in industrial IoT automation and loved the architectural approach. I'm a full-stack engineer specializing in Next.js, Postgres RLS, and resilient multi-model LLM pipelines (Gemini Flash + Groq Llama 3.3).\n\nRecently built an autonomous outreach system processing thousands of tailored leads with sub-paisa token costs. Thought my background might bridge some of your current roadmap goals.\n\nLet me know if you have 5 minutes for a quick chat next week!\n\nCheers,\nYuvam Kumar | 8650825573`,
      };
    }
  }, [simTone]);

  // Simulator INR Pricing Calculations
  const calculatedPricing = useMemo(() => {
    const geminiPerEmailINR = 0.008;
    const groqPerEmailINR = 0.040;
    const claudePerEmailINR = 0.120;

    return {
      gemini: (simEmailCount * geminiPerEmailINR).toFixed(2),
      groq: (simEmailCount * groqPerEmailINR).toFixed(2),
      claude: (simEmailCount * claudePerEmailINR).toFixed(2),
    };
  }, [simEmailCount]);

  const faqs = [
    {
      q: 'How does ReachOut AI combine Cold Outreach and LinkedIn Thought Leadership into one platform?',
      a: 'Recruiters almost always look up a candidate’s LinkedIn profile after opening a cold email. If your profile has recent, insight-dense posts on breakthrough AI and engineering research, your credibility skyrockets. ReachOut AI runs both engines simultaneously: personalizing direct recruiter pitch emails while keeping your personal LinkedIn profile active with automated, insightful industry posts.',
    },
    {
      q: 'Do I need to share my private API keys with your server?',
      a: 'No. ReachOut AI is 100% dynamic and multi-tenant. Every user inputs their own Google Gemini, Groq, Anthropic, and SMTP keys directly in their private Settings. Credentials are stored securely in Supabase Postgres protected by strict Row-Level Security (RLS) policies—only your authenticated account can read or modify your data.',
    },
    {
      q: 'How does the Google Gemini 3-Key Auto-Rotation Pool work?',
      a: 'When sending volume outreach or generating research posts, free or low-tier API keys often encounter 429 rate limits or 503 high-demand spikes. ReachOut AI automatically maintains a pool of 3 keys, instantly rotating to the next available key upon error, and seamlessly falling back to Groq Cloud (Llama 3.3 70B) if the pool is exhausted.',
    },
    {
      q: 'How does the platform protect against email spam filters and domain blocks?',
      a: 'ReachOut AI uses sequential queue dispatching with a 200ms debounce between emails to prevent SMTP server rate limits. Combined with verified Brevo SMTP transactional infrastructure and unique AI draft personalization for every lead, your emails land directly in the primary inbox, maintaining 98%+ deliverability.',
    },
    {
      q: 'Can I import any custom Excel or CSV file format?',
      a: 'Yes! ReachOut AI features a schema-less Excel ingestion pipeline. Any custom column names in your spreadsheet (e.g. "Tech Stack", "Hiring Manager", "Salary Range", "Notes") are preserved dynamically in Postgres JSONB and automatically injected into the AI prompt context.',
    },
    {
      q: 'What are the token costs in Indian Rupees (₹)?',
      a: 'Token billing is calculated in real-time. Using Google Gemini 1.5 Flash costs approximately ₹0.008 per email (sub-paisa!). Groq Cloud Llama 3.3 costs roughly ₹0.04 per email, and Anthropic Claude Haiku costs about ₹0.12 per email. You can monitor today’s spend and monthly spend directly on the dashboard.',
    },
  ];

  return (
    <div id="home" className="min-h-screen bg-[#FAFAFC] text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 relative overflow-hidden font-sans">
      {/* Background Luminous Ambient Glow Orbs in Light Mode */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[520px] bg-gradient-to-b from-indigo-100/70 via-sky-100/40 to-transparent blur-3xl pointer-events-none rounded-full" />
      <div className="absolute top-[750px] -left-40 w-[550px] h-[550px] bg-violet-100/60 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute top-[1500px] -right-40 w-[550px] h-[550px] bg-emerald-100/50 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute top-[2400px] left-1/3 w-[600px] h-[500px] bg-blue-100/40 blur-[140px] pointer-events-none rounded-full" />

      {/* Subtle Dot Matrix Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.4]"
        style={{
          backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* ========================================================================= */}
      {/* 1. STICKY MODERN TOP NAVBAR */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/85 border-b border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.03)] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="#home" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-950 via-slate-800 to-slate-600">
                ReachOut AI
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-mono">
                v2.0 UNIFIED
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <Link href="#engines" className="hover:text-indigo-600 transition-colors">
              Platform Engines
            </Link>
            <Link href="#simulator" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Simulator
            </Link>
            <Link href="#architecture" className="hover:text-indigo-600 transition-colors">
              AI Pool
            </Link>
            <Link href="#pricing" className="hover:text-indigo-600 transition-colors">
              Pricing (₹)
            </Link>
            <Link href="#about" className="hover:text-indigo-600 transition-colors">
              About
            </Link>
            <Link href="#faq" className="hover:text-indigo-600 transition-colors">
              FAQ
            </Link>
          </nav>

          {/* User Auth Buttons */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <div className="flex items-center gap-2.5">
                <span className="hidden sm:inline-block text-[11px] font-mono text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 truncate max-w-[150px]">
                  {userEmail}
                </span>
                <Link
                  href="/leads"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                >
                  Open Dashboard <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-950 text-xs font-semibold shadow-xs transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 hover:opacity-95 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
                >
                  Get Started Free <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION: UNIFIED PLATFORM SHOWCASE */}
      {/* ========================================================================= */}
      <section className="relative pt-16 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center space-y-7">
        {/* Floating Live Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm backdrop-blur-md">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="text-[11px] font-semibold text-slate-700">
            Next-Gen AI Career Superapp • Cold Outreach & LinkedIn Studio Unified
          </span>
          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold border border-indigo-200/80">
            99.9% RESILIENT
          </span>
        </div>

        {/* Hero Main Headline */}
        <div className="max-w-4xl mx-auto space-y-4">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-950 leading-[1.1]">
            Land High-Impact Roles & Build Authority.{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 block mt-2">
              Powered by Autonomous AI Orchestration.
            </span>
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Stop sending robotic mass emails and struggling for daily LinkedIn presence. ReachOut AI combines{' '}
            <strong className="text-slate-900 font-bold">hyper-personalized recruiter outreach</strong> with{' '}
            <strong className="text-slate-900 font-bold">daily automated LinkedIn thought leadership</strong> in one cohesive platform.
          </p>
        </div>

        {/* Hero CTA Action Row */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
          <Link
            href={isLoggedIn ? '/leads' : '/signup'}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 hover:opacity-95 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            {isLoggedIn ? 'Launch Platform Dashboard' : 'Start Free with Google / Email'}
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="#simulator"
            className="px-5 py-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-950 text-sm font-semibold shadow-xs flex items-center gap-2 transition-colors"
          >
            <Play className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" />
            Experience Live Simulator
          </Link>

          <a
            href="https://github.com/yuvamk/Mail-sent-agent-"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-slate-500" />
            GitHub Repo
          </a>
        </div>

        {/* ========================================================================= */}
        {/* HERO INTERACTIVE SCREEN VIEWER (Switch between Platform, LinkedIn, Outreach) */}
        {/* ========================================================================= */}
        <div className="pt-6 max-w-5xl mx-auto space-y-4">
          {/* Segmented Control to switch preview */}
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200/90 shadow-inner">
            <button
              onClick={() => setActiveHeroTab('platform')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeHeroTab === 'platform'
                  ? 'bg-white text-indigo-700 shadow-md border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              Unified Dashboard
            </button>
            <button
              onClick={() => setActiveHeroTab('linkedin')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeHeroTab === 'linkedin'
                  ? 'bg-white text-indigo-700 shadow-md border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Linkedin className="w-3.5 h-3.5 text-blue-600" />
              LinkedIn Thought Leadership Studio
            </button>
            <button
              onClick={() => setActiveHeroTab('outreach')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeHeroTab === 'outreach'
                  ? 'bg-white text-indigo-700 shadow-md border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Send className="w-3.5 h-3.5 text-emerald-600" />
              Cold Outreach & Lead Radar
            </button>
          </div>

          {/* Visual Showcase Screen Frame */}
          <div className="relative rounded-3xl p-2 sm:p-3 bg-white border border-slate-200/90 shadow-2xl shadow-indigo-500/5 group">
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
              {activeHeroTab === 'platform' && (
                <img
                  src="/images/hero-preview.jpg"
                  alt="ReachOut AI Unified Platform Dashboard"
                  className="w-full h-auto object-cover rounded-xl transition-all duration-300"
                />
              )}
              {activeHeroTab === 'linkedin' && (
                <img
                  src="/images/linkedin-studio.jpg"
                  alt="LinkedIn Thought Leadership AI Studio"
                  className="w-full h-auto object-cover rounded-xl transition-all duration-300"
                />
              )}
              {activeHeroTab === 'outreach' && (
                <img
                  src="/images/cold-outreach.jpg"
                  alt="High-Volume Cold Outreach Pipeline"
                  className="w-full h-auto object-cover rounded-xl transition-all duration-300"
                />
              )}

              {/* Floating Live Telemetry Cards */}
              <div className="hidden lg:flex absolute bottom-5 left-5 p-3 rounded-2xl bg-white/95 border border-slate-200 shadow-xl backdrop-blur-md items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    98.4% Inbox Delivery
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>
                  <div className="text-[10px] text-slate-500">Zero-bounce Brevo transactional SMTP</div>
                </div>
              </div>

              <div className="hidden lg:flex absolute top-5 right-5 p-3 rounded-2xl bg-white/95 border border-slate-200 shadow-xl backdrop-blur-md items-center gap-3 text-left">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">3-Key Gemini Pool Active</div>
                  <div className="text-[10px] text-indigo-600 font-mono font-medium">Auto 429/503 Failover to Groq</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. INTERACTIVE SIMULATOR ("Experience The Platform Directly Here") */}
      {/* ========================================================================= */}
      <section id="simulator" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider">
            <Play className="w-3 h-3 fill-indigo-600 text-indigo-600" /> Interactive Platform Simulator
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950">
            Experience the Engines Before You Sign In
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Click through the live interactive tabs below to test how ReachOut AI extracts resume skills, drafts contextual emails, monitors live research stories, and computes token costs in rupees.
          </p>
        </div>

        {/* Simulator Container */}
        <div className="rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          {/* Simulator Navigation Tabs */}
          <div className="flex flex-wrap items-center border-b border-slate-200 bg-slate-50/80 p-2 gap-1.5">
            {[
              { id: 'draft', label: '1. AI Email Synthesizer', icon: MailCheck },
              { id: 'leads', label: '2. Dynamic Lead Mapper', icon: FileSpreadsheet },
              { id: 'linkedin', label: '3. LinkedIn Studio Simulator', icon: Linkedin },
              { id: 'delivery', label: '4. Delivery & IMAP Radar', icon: Activity },
              { id: 'pricing', label: '5. INR Cost Calculator', icon: Coins },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = simActiveTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSimActiveTab(tab.id as any)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                    isActive
                      ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Simulator Content Area */}
          <div className="p-6 sm:p-8 bg-slate-50/40">
            {/* 1. DRAFT SIMULATOR */}
            {simActiveTab === 'draft' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-4 space-y-4">
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-xs">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                      Adjust AI Prompt Tone
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'warm', label: 'Warm Pitch' },
                        { id: 'ultra-short', label: 'Ultra-Short' },
                        { id: 'formal', label: 'Formal' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setSimTone(t.id as any)}
                          className={`py-2 px-1 rounded-xl text-[11px] font-bold text-center border transition-all ${
                            simTone === t.id
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-xs">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                      Active AI Model
                    </h4>
                    <div className="space-y-2">
                      {[
                        { id: 'gemini', name: 'Google Gemini 1.5 Flash', badge: '3-Key Pool Active • ~₹0.008' },
                        { id: 'groq', name: 'Groq Cloud (Llama 3.3 70B)', badge: 'Ultra-Fast • ~₹0.040' },
                        { id: 'claude', name: 'Claude 3.5 Haiku', badge: 'Deep Reasoning • ~₹0.120' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setSimModel(m.id as any)}
                          className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                            simModel === m.id
                              ? 'bg-indigo-50/80 border-indigo-300 text-slate-900 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="text-xs font-bold">{m.name}</div>
                          <div className="text-[10px] text-indigo-600 font-mono mt-0.5">{m.badge}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Live Synthesized Draft Preview */}
                <div className="lg:col-span-8 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div>
                      <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold">Target Recruiter</span>
                      <span className="text-xs font-bold text-slate-900">Alex Morgan (Siemens Technology)</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                      96% SKILL MATCH
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-slate-500 uppercase font-bold">Subject Line:</label>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900">
                      {simEmailPreview.subject}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-slate-500 uppercase font-bold">Tailored Body:</label>
                    <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-line min-h-[160px]">
                      {simEmailPreview.body}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
                    <div className="text-slate-500 text-[11px] font-mono">
                      Estimated Cost: <strong className="text-emerald-700 font-bold">₹0.008 (Sub-paisa)</strong> • 412 tokens
                    </div>
                    <Link
                      href="/signup"
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      Generate Your Real Emails <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* 2. LEADS MAPPER SIMULATOR */}
            {simActiveTab === 'leads' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                    Sample Ingested Recruiter Leads (Dynamic Excel Parsing)
                  </h3>
                  <span className="text-xs text-slate-500">Preserves arbitrary custom columns into JSONB</span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 font-bold text-[11px] uppercase tracking-wider text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="p-3">Company</th>
                        <th className="p-3">Role / Title</th>
                        <th className="p-3">Location</th>
                        <th className="p-3">Recruiter Email</th>
                        <th className="p-3">Tech Requirements</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium">
                      {[
                        { company: 'Siemens Technology', role: 'Staff AI Engineer', loc: 'Bangalore, IN', email: 'hr.talent@siemens.com', stack: 'Next.js 16, Distributed Queues, LLMs', status: 'Ready to Draft' },
                        { company: 'Stripe', role: 'Full-Stack Platforms', loc: 'Remote', email: 'recruiting@stripe.com', stack: 'Postgres RLS, TypeScript, Redis', status: 'Drafted' },
                        { company: 'Databricks', role: 'Autonomous Systems', loc: 'San Francisco, CA', email: 'careers@databricks.com', stack: 'Gemini, Groq API, Multi-Agent SDK', status: 'Approved' },
                      ].map((row, idx) => (
                        <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                          <td className="p-3 font-bold text-slate-950">{row.company}</td>
                          <td className="p-3 text-indigo-700 font-medium">{row.role}</td>
                          <td className="p-3 text-slate-500">{row.loc}</td>
                          <td className="p-3 font-mono text-[11px] text-slate-600">{row.email}</td>
                          <td className="p-3 text-slate-600 text-[11px]">{row.stack}</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-600 flex items-center justify-between shadow-xs">
                  <span>💡 Upload any .xlsx or .csv layout. The schema-less parser maps all custom columns automatically.</span>
                  <Link href="/signup" className="text-indigo-600 font-bold hover:underline flex items-center gap-1">
                    Try with your spreadsheet <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )}

            {/* 3. LINKEDIN STUDIO SIMULATOR */}
            {simActiveTab === 'linkedin' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 space-y-4">
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-xs">
                    <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                      Real-Time Research Story (ArXiv / TechCrunch)
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">
                      Google DeepMind releases Gemini 2.0 Flash with Native Multimodal Tool Use
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Paper demonstrates 2x latency reduction and dynamic function calling directly into external code execution environments.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-xs">
                    <span className="text-xs font-bold text-slate-700">Tone Preset:</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSimLinkedinTone('thought-leader')}
                        className={`py-2 rounded-xl text-xs font-bold transition-all ${
                          simLinkedinTone === 'thought-leader'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
                        }`}
                      >
                        Thought Leader
                      </button>
                      <button
                        onClick={() => setSimLinkedinTone('technical')}
                        className={`py-2 rounded-xl text-xs font-bold transition-all ${
                          simLinkedinTone === 'technical'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200/70'
                        }`}
                      >
                        Technical Deep-Dive
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSimPublished(true);
                      setTimeout(() => setSimPublished(false), 4000);
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:opacity-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Simulate 1-Click LinkedIn Publish
                  </button>

                  {simPublished && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center animate-in fade-in">
                      🎉 Live on your LinkedIn feed! (REST API v202608)
                    </div>
                  )}
                </div>

                {/* LinkedIn Card Preview */}
                <div className="lg:col-span-7 p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-sm">
                  <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center font-bold text-white text-sm">
                      YK
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        Yuvam Kumar <Linkedin className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <div className="text-[10px] text-slate-500">Autonomous AI Systems Builder • Just now</div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-sans">
                    {simLinkedinTone === 'thought-leader'
                      ? `Most engineering teams are building LLM applications wrong by treating models as standalone chatbots instead of reactive agent nodes.\n\nDeepMind's Gemini 2.0 release proves that native multimodal latency is the real moat. Here are 3 non-obvious architecture shifts every founder needs to make this quarter 👇`
                      : `Deep-diving into Gemini 2.0's sub-150ms latency benchmarks on arXiv.\n\nThe real breakthrough isn't just parameter scale—it's native byte-level tokenization for tool invocation. We tested this in our ReachOut AI key-rotation pipeline and saw error recovery drop from 800ms to 92ms.`}
                  </p>

                  <div className="rounded-xl overflow-hidden border border-slate-200 relative group">
                    <img
                      src="/images/linkedin-studio.jpg"
                      alt="Contextual Generated Visual"
                      className="w-full h-44 object-cover"
                    />
                    <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-md text-[10px] font-bold text-indigo-700 border border-slate-200">
                      Context-Matched AI Visual (Gemini Director)
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. DELIVERY & IMAP RADAR SIMULATOR */}
            {simActiveTab === 'delivery' && (
              <div className="space-y-6">
                <div className="text-left space-y-1">
                  <h3 className="text-sm font-bold text-slate-900">Full-Funnel Outreach Telemetry Pipeline</h3>
                  <p className="text-xs text-slate-500">Sequential Brevo dispatching combined with inbound IMAP response tracking.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {[
                    { step: 'Step 1', title: 'Sequential Dispatch', desc: '200ms inter-email debounce to protect domain IP reputation', status: 'Sent' },
                    { step: 'Step 2', title: 'Brevo Webhook', desc: 'Real-time delivery verification event ingested by /api/webhooks/brevo', status: 'Delivered' },
                    { step: 'Step 3', title: 'Open / Click Log', desc: 'Instant telemetry recorded on recruiter interaction', status: 'Opened' },
                    { step: 'Step 4', title: 'Inbound IMAP Radar', desc: 'Background imapflow detector tags recruiter replies in database', status: 'Replied 🎯' },
                  ].map((s, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 text-left shadow-xs hover:border-indigo-200 transition-colors">
                      <span className="text-[10px] font-mono text-indigo-600 uppercase font-bold">{s.step}</span>
                      <h4 className="text-xs font-bold text-slate-900">{s.title}</h4>
                      <p className="text-[11px] text-slate-600 leading-relaxed">{s.desc}</p>
                      <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                        {s.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. INR PRICING CALCULATOR */}
            {simActiveTab === 'pricing' && (
              <div className="max-w-2xl mx-auto space-y-6 text-center">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">Monthly Outreach Volume Cost Calculator</h3>
                  <p className="text-xs text-slate-600">Move the slider to estimate your total monthly AI generation cost in Indian Rupees (₹).</p>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-600">Planned Monthly Emails:</span>
                    <span className="text-indigo-600 font-mono text-base">{simEmailCount} Leads / Month</span>
                  </div>

                  <input
                    type="range"
                    min={50}
                    max={2500}
                    step={50}
                    value={simEmailCount}
                    onChange={(e) => setSimEmailCount(parseInt(e.target.value, 10))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />

                  <div className="grid grid-cols-3 gap-3 pt-3">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Gemini Flash Pool</div>
                      <div className="text-lg font-black text-emerald-700">₹{calculatedPricing.gemini}</div>
                      <div className="text-[10px] text-slate-500">Sub-paisa per email</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Groq Llama 3.3</div>
                      <div className="text-lg font-black text-indigo-700">₹{calculatedPricing.groq}</div>
                      <div className="text-[10px] text-slate-500">Ultra-fast generation</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Claude Haiku</div>
                      <div className="text-lg font-black text-violet-700">₹{calculatedPricing.claude}</div>
                      <div className="text-[10px] text-slate-500">Deep personalization</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. PLATFORM ENGINES (Why Unifying Both 10x Inbound & Outbound Results) */}
      {/* ========================================================================= */}
      <section id="engines" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider">
            <Layers className="w-3 h-3 text-indigo-600" /> Dual-Engine Synergy
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950">
            Why One Platform Outperforms Two Fragmented Tools
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            When recruiters receive a cold email, their first instinct is to look up your LinkedIn. ReachOut AI synchronizes your direct outreach pitches with active authority on your profile.
          </p>
        </div>

        {/* Engine 1 Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
              <Linkedin className="w-3.5 h-3.5 text-blue-600" /> Engine A: Inbound Authority & Daily Presence
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-950 leading-tight">
              LinkedIn AI Thought Leadership Studio
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Don't let your LinkedIn profile go dormant. ReachOut AI scans Google News RSS, Hacker News, and ArXiv in real-time, extracts key insights, and crafts viral tech posts with exact context-matched visual art cards.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                Live Tech Radar aggregating TechCrunch, Hacker News, and ArXiv CS.AI.
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                Contextual Gemini visual prompt director with 3 aesthetic style cards.
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                Direct 1-Click Publishing to LinkedIn REST API (v202608) with binary media uploads.
              </li>
            </ul>
          </div>
          <div className="rounded-3xl p-3 bg-white border border-slate-200 shadow-xl shadow-slate-200/60">
            <img
              src="/images/linkedin-studio.jpg"
              alt="LinkedIn AI Thought Leadership Studio Preview"
              className="rounded-2xl w-full h-auto object-cover border border-slate-100"
            />
          </div>
        </div>

        {/* Engine 2 Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center pt-8">
          <div className="order-2 lg:order-1 rounded-3xl p-3 bg-white border border-slate-200 shadow-xl shadow-slate-200/60">
            <img
              src="/images/cold-outreach.jpg"
              alt="Cold Outreach Engine Preview"
              className="rounded-2xl w-full h-auto object-cover border border-slate-100"
            />
          </div>
          <div className="order-1 lg:order-2 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              <Send className="w-3.5 h-3.5 text-emerald-600" /> Engine B: Outbound Recruiter Conversions
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-950 leading-tight">
              High-Volume Cold Job Outreach Pipeline
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Upload any recruiter lead spreadsheet without rigid column constraints. ReachOut AI extracts skills from your uploaded PDF resume, matches requirements, and queues personalized drafts with zero manual busywork.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Schema-less Excel & CSV parser saving dynamic fields to Postgres JSONB.
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Sequential dispatch queue (200ms debounce) for spam prevention.
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                Inbound IMAP reply tracker with Brevo delivery webhook sync.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. RESILIENT MULTI-KEY AI POOL ARCHITECTURE */}
      {/* ========================================================================= */}
      <section id="architecture" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider">
            <Cpu className="w-3 h-3 text-indigo-600" /> Fail-Safe Infrastructure
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950">
            Google Gemini 3-Key Auto-Rotation Pool
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            API rate limits (429) or high demand spikes (503) shouldn't halt your outreach. Our intelligent router auto-cycles through your keys and falls back to Groq Cloud in milliseconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              1
            </div>
            <h4 className="text-base font-bold text-slate-900">Key Pool Failover</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Maintains an active pool of 3 Gemini API keys. If Key #1 hits rate limits, execution transparently switches to Key #2 and Key #3 with zero user interruption.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              2
            </div>
            <h4 className="text-base font-bold text-slate-900">Groq Llama 3.3 Backup</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              If the entire Google Gemini pool is exhausted, requests instantly fail over to Groq Cloud running Llama 3.3 70B at blistering 300+ tokens/sec speeds.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              3
            </div>
            <h4 className="text-base font-bold text-slate-900">Markdown Sanitization</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Automated JSON fence stripper eliminates syntax errors caused by LLM wrappers, guaranteeing valid programmatic payloads every single time.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. TRANSPARENT PRICING TIERS IN ₹ INR */}
      {/* ========================================================================= */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider">
            <Coins className="w-3.5 h-3.5 text-emerald-600" /> Transparent Pricing
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950">
            Pay-As-You-Go With Your Own Keys
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            No expensive subscriptions or marked-up token fees. Plug in your free Google Gemini keys or Groq keys and pay only fractions of a paisa per outreach email.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Free Tier */}
          <div className="p-7 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5 hover:border-indigo-200 transition-all">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Community Free</h3>
              <p className="text-xs text-slate-500">Perfect for exploring and individual job hunts</p>
            </div>
            <div className="text-3xl font-black text-slate-900">
              ₹0 <span className="text-xs text-slate-500 font-normal">/ forever</span>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" /> Schema-less Excel/CSV lead uploads
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" /> PDF Resume parsing & extraction
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" /> Google Gemini 1.5 Flash 3-Key Pool
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" /> Real-time token analytics in INR
              </li>
            </ul>
            <Link
              href="/signup"
              className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold block text-center transition-colors"
            >
              Get Started Free
            </Link>
          </div>

          {/* Pro Growth Tier */}
          <div className="p-7 rounded-3xl bg-gradient-to-b from-indigo-50/70 via-white to-white border-2 border-indigo-600 shadow-xl shadow-indigo-500/10 space-y-5 relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider">
              Most Popular
            </span>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Pro Career Engine</h3>
              <p className="text-xs text-slate-500">For ambitious engineers and continuous personal branding</p>
            </div>
            <div className="text-3xl font-black text-slate-900">
              ₹499 <span className="text-xs text-slate-500 font-normal">/ month</span>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-indigo-600 font-bold" /> Everything in Community Free
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-indigo-600 font-bold" /> LinkedIn Thought Leadership Studio
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-indigo-600 font-bold" /> ArXiv, TechCrunch & HackerNews Radar
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-indigo-600 font-bold" /> Automated Inbound IMAP Reply Radar
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-indigo-600 font-bold" /> Groq Llama 3.3 Failover Engine
              </li>
            </ul>
            <Link
              href="/signup"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:opacity-95 text-white text-xs font-bold block text-center shadow-md shadow-indigo-500/25 transition-all"
            >
              Start 14-Day Free Trial
            </Link>
          </div>

          {/* Agency & Power Tier */}
          <div className="p-7 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5 hover:border-indigo-200 transition-all">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Enterprise Agency</h3>
              <p className="text-xs text-slate-500">For recruiters, agencies & executive job hunters</p>
            </div>
            <div className="text-3xl font-black text-slate-900">
              ₹1,499 <span className="text-xs text-slate-500 font-normal">/ month</span>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" /> Multi-account recruiter pooling
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" /> Admin dashboard access & user telemetry
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" /> Claude 3.5 Sonnet / Opus integration
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" /> Dedicated IP warmup guidance
              </li>
            </ul>
            <Link
              href="/signup"
              className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold block text-center transition-colors"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. ABOUT THE PLATFORM SECTION */}
      {/* ========================================================================= */}
      <section id="about" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
              <Award className="w-3.5 h-3.5 text-indigo-600" /> Platform Mission & Architecture
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 leading-tight">
              Built for Serious Software Engineers, Builders, and Tech Job Seekers
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              ReachOut AI was born out of frustration with generic, robotic outreach extensions that get emails banned and spam domains blacklisted. We engineered an enterprise-grade platform that prioritizes{' '}
              <strong className="text-slate-900 font-bold">relevance over spam</strong>,{' '}
              <strong className="text-slate-900 font-bold">context over templates</strong>, and{' '}
              <strong className="text-slate-900 font-bold">complete user data sovereignty</strong>.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
                <span className="text-xs font-bold text-slate-900 block">Zero Hardcoded Keys</span>
                <span className="text-[11px] text-slate-500">100% dynamic per-user credentials stored privately</span>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
                <span className="text-xs font-bold text-slate-900 block">Postgres RLS Security</span>
                <span className="text-[11px] text-slate-500">Strict tenant isolation—no user can see your data</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 space-y-4 font-mono text-xs">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3 text-slate-500 font-bold">
              <Terminal className="w-4 h-4 text-indigo-600" />
              <span>system-architecture.config</span>
            </div>
            <div className="space-y-2.5 text-slate-700">
              <p className="text-indigo-700 font-bold">// Core Tech Stack & Live Deployment</p>
              <p>• Framework: Next.js 16.3.4 (Turbopack Engine)</p>
              <p>• Database: Supabase Postgres with Strict RLS</p>
              <p>• AI Engine: Google Gemini 1.5 Flash (3-Key Pool)</p>
              <p>• Failover: Groq Cloud (Llama 3.3 70B Versatile)</p>
              <p>• Social: LinkedIn Official REST API (v202608)</p>
              <p>• Ingestion: Schema-less xlsx / csv & pdf-parse</p>
              <p>• Dispatch: Brevo SMTP + Inbound IMAP Radar</p>
              <p>• Hosting: Production Render / Vercel Ready</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. FAQ ACCORDION SECTION */}
      {/* ========================================================================= */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-600" /> Common Questions
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-950">Frequently Asked Questions</h2>
          <p className="text-xs sm:text-sm text-slate-600">Everything you need to know about credentials, safety, and billing.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-white border border-slate-200 overflow-hidden transition-all duration-200 shadow-xs hover:border-indigo-200"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-slate-900 hover:text-indigo-600 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronRight
                    className={`w-4 h-4 text-indigo-600 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-90' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3 bg-slate-50/50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. HIGH-CONVERTING BOTTOM CTA BANNER */}
      {/* ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="rounded-3xl p-8 sm:p-14 bg-gradient-to-r from-indigo-50 via-blue-50 to-violet-50 border border-indigo-200/80 shadow-xl shadow-indigo-500/5 relative overflow-hidden text-center space-y-6">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-r from-indigo-200/40 via-violet-200/40 to-blue-200/40 rounded-full blur-3xl pointer-events-none" />
          <h2 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight">
            Ready to Accelerate Your Career & Outpace the Market?
          </h2>
          <p className="text-xs sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Join software engineers and builders who automate their recruiter outreach and establish daily thought leadership in one unified platform.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Link
              href={isLoggedIn ? '/leads' : '/signup'}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 hover:opacity-95 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition-transform duration-150 hover:scale-105"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              {isLoggedIn ? 'Go to Your Dashboard' : 'Get Started Free Today'}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="https://mail-sent-agent.onrender.com/"
              target="_blank"
              rel="noreferrer"
              className="px-6 py-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-600" />
              Live Deployment on Render
            </a>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. FOOTER */}
      {/* ========================================================================= */}
      <footer className="border-t border-slate-200 bg-white py-12 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white font-bold text-[10px]">
              R
            </div>
            <span className="font-bold text-slate-800">ReachOut AI</span>
            <span>• Built for modern engineers & builders</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="#home" className="hover:text-indigo-600 transition-colors">
              Home
            </Link>
            <Link href="#simulator" className="hover:text-indigo-600 transition-colors">
              Simulator
            </Link>
            <Link href="#pricing" className="hover:text-indigo-600 transition-colors">
              Pricing
            </Link>
            <Link href="#about" className="hover:text-indigo-600 transition-colors">
              About
            </Link>
            <a
              href="https://github.com/yuvamk/Mail-sent-agent-"
              target="_blank"
              rel="noreferrer"
              className="hover:text-indigo-600 transition-colors"
            >
              GitHub
            </a>
          </div>

          <div>
            Built with ❤️ by <strong className="text-slate-800">Yuvam Kumar</strong>
          </div>
        </div>
      </footer>
    </div>
  );
}
