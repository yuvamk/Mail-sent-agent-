'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import {
  Sparkles,
  Mail,
  Lock,
  User,
  Phone,
  UserPlus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ArrowRight,
} from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'info' | 'otp'>('info');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  // Step 1: Submit info and send OTP
  const handleSubmitInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAlreadyRegistered(false);

    try {
      // 1. Dispatch OTP code to user's email
      const otpRes = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          email,
          name,
          phone,
        }),
      });

      const otpData = await otpRes.json();
      if (!otpRes.ok || !otpData.success) {
        throw new Error(otpData.error || 'Failed to dispatch verification code');
      }

      // Also create account record in background
      await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email,
          password: password || 'ReachOut_Trial2026!',
        }),
      }).catch((e) => console.warn('Signup background sync notice:', e));

      setStep('otp');
    } catch (err: any) {
      setError(err?.message || 'Failed to initiate account creation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and log in
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          email,
          code: otpCode,
          name,
          phone,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid verification code');
      }

      // Sign in locally with password
      if (password) {
        await supabaseBrowser.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
      }

      router.push('/leads');
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFC] flex flex-col justify-center items-center p-4 relative font-sans">
      {/* Soft Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-indigo-100/70 via-sky-100/30 to-transparent blur-3xl pointer-events-none rounded-full" />

      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-7 sm:p-8 shadow-xl shadow-slate-200/50 space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/25 mx-auto hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </Link>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">Create Workspace Account</h1>
          <p className="text-xs text-slate-500">Get your private multi-tenant AI Outreach & LinkedIn Workspace</p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {alreadyRegistered && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Account Already Exists</span>
            </div>
            <p className="text-amber-800">
              An account with <strong>{email}</strong> is already registered.
            </p>
            <Link
              href={`/login?email=${encodeURIComponent(email)}`}
              className="inline-block px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-xs hover:bg-indigo-700 transition-colors"
            >
              Sign in with Email OTP &rarr;
            </Link>
          </div>
        )}

        {/* STEP 1: INITIAL INFORMATION */}
        {step === 'info' && (
          <form onSubmit={handleSubmitInfo} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" /> Full Name (Signature)
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Smith"
                id="input-signup-name"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-indigo-600" /> Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 9876543210"
                id="input-signup-phone"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
              />
            </div>

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
                id="input-signup-email"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-600" /> Password (Optional / For Direct Login)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="•••••••• (or leave blank to use OTP)"
                id="input-signup-password"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              id="btn-signup-submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 hover:opacity-95 text-white text-xs font-bold shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Sending 6-Digit Code...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Send Verification Code &rarr;
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: VERIFY OTP CODE */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-2 text-center">
              <span className="text-xs text-slate-500">
                A 6-digit verification code was sent to <strong>{email}</strong>
              </span>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                id="input-signup-otp"
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
                  <Loader2 className="w-4 h-4 animate-spin" /> Activating Workspace...
                </>
              ) : (
                <>
                  Verify Code & Launch Workspace <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep('info')}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-800"
            >
              &larr; Back to edit details
            </button>
          </form>
        )}

        {/* Switch to Login */}
        <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 font-bold hover:underline">
            Sign in here &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
