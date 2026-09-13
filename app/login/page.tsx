'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import {
  Sparkles,
  Mail,
  Lock,
  LogIn,
  Loader2,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [authMode, setAuthMode] = useState<'otp' | 'password'>('otp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer((t) => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  // Handle Standard Password Login
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { error: authError } = await supabaseBrowser.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) throw authError;
      router.push('/leads');
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', email }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send OTP');
      }

      setOtpSent(true);
      setOtpTimer(60);
      setSuccessMessage(`A 6-digit verification code was sent to ${email}`);
    } catch (err: any) {
      setError(err?.message || 'Could not dispatch OTP code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Directly verify against our platform SMTP OTP verification endpoint (zero Supabase mail/OTP dependency)
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', email, code: otpCode }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid verification code');
      }

      if (data.actionLink) {
        window.location.href = data.actionLink;
      } else {
        router.push('/leads');
      }
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please ensure the code is correct.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFC] flex flex-col justify-center items-center p-4 relative font-sans">
      {/* Soft Ambient Background Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-indigo-100/70 via-sky-100/30 to-transparent blur-3xl pointer-events-none rounded-full" />

      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-7 sm:p-8 shadow-xl shadow-slate-200/50 space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/25 mx-auto hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </Link>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">Welcome Back</h1>
          <p className="text-xs text-slate-500">Sign in to your ReachOut AI Career Workspace</p>
        </div>

        {/* Auth Mode Toggle */}
        <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setAuthMode('otp');
              setError(null);
            }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'otp'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" /> Email OTP
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('password');
              setError(null);
            }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'password'
                ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5" /> Password
          </button>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: EMAIL OTP LOGIN */}
        {/* ========================================================================= */}
        {authMode === 'otp' && (
          <div className="space-y-4">
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-600" /> Your Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    id="input-login-otp-email"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 hover:opacity-95 text-white text-xs font-bold shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Dispatching 6-Digit Code...
                    </>
                  ) : (
                    <>
                      Send 6-Digit OTP Code <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-indigo-600" /> Enter 6-Digit Code
                    </label>
                    <span className="text-[11px] text-slate-500 font-mono truncate max-w-[150px]">{email}</span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    id="input-login-otp-code"
                    autoFocus
                    className="w-full px-4 py-3 text-center tracking-[8px] font-mono text-xl font-bold rounded-xl bg-slate-50 border border-slate-200 text-indigo-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length < 6}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 hover:opacity-95 text-white text-xs font-bold shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Verifying Code...
                    </>
                  ) : (
                    <>
                      Verify & Open Dashboard <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode('');
                    }}
                    className="text-slate-500 hover:text-slate-800"
                  >
                    Change email
                  </button>
                  <button
                    type="button"
                    disabled={otpTimer > 0 || loading}
                    onClick={handleSendOtp}
                    className="text-indigo-600 font-bold hover:underline disabled:opacity-50"
                  >
                    {otpTimer > 0 ? `Resend in ${otpTimer}s` : 'Resend Code'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: TRADITIONAL PASSWORD LOGIN */}
        {/* ========================================================================= */}
        {authMode === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-600" /> Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                id="input-login-password-email"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-600" /> Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                id="input-login-password"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              id="btn-login-submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 hover:opacity-95 text-white text-xs font-bold shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Signing In...
                </>
              ) : (
                <>
                  Sign In with Password <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Switch to Signup */}
        <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
          Don't have an account yet?{' '}
          <Link href="/signup" className="text-indigo-600 font-bold hover:underline">
            Create account & start free trial &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAFAFC] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
