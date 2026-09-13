'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AlertTriangle, ShieldAlert, ArrowRight, Sparkles, CheckCircle2, Clock, X } from 'lucide-react';
import { SubscriptionStatus } from '@/lib/subscription-plans';

export default function SubscriptionAlert() {
  const pathname = usePathname();
  const router = useRouter();
  const [sub, setSub] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissedWarning, setDismissedWarning] = useState(false);

  useEffect(() => {
    // Don't show alerts on public marketing pages or billing page
    if (pathname === '/' || pathname === '/login' || pathname === '/signup' || pathname === '/billing') {
      return;
    }

    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/payment/status');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.subscription) {
            setSub(data.subscription);
          }
        }
      } catch (err) {
        console.warn('Failed to load subscription status:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [pathname]);

  if (pathname === '/' || pathname === '/login' || pathname === '/signup' || pathname === '/billing') {
    return null;
  }

  if (loading || !sub || sub.isAdmin) {
    return null;
  }

  // 1. HARD EXPIRED: Show Persistent Red Paywall Banner + Blocking Modal Overlay
  if (sub.isLocked) {
    return (
      <>
        {/* Top Sticky Red Banner */}
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-rose-950 flex items-center gap-2">
                Subscription Expired • Services Paused
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 text-rose-800">
                  ACTION REQUIRED
                </span>
              </h4>
              <p className="text-xs text-rose-700 mt-0.5">
                Your plan ({sub.planName}) ended on{' '}
                <strong>{new Date(sub.currentPeriodEnd).toLocaleDateString()}</strong>. AI drafting, email sending, and LinkedIn automation are temporarily locked.
              </p>
            </div>
          </div>
          <Link
            href="/billing"
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/25 flex items-center gap-1.5 shrink-0 transition-all hover:scale-105"
          >
            Reactivate Services Now <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Blocking Paywall Modal (for protected action pages like leads, review, linkedin) */}
        {(pathname === '/review' || pathname === '/linkedin') && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-md w-full rounded-3xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-8 text-center space-y-5 animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-950">Subscription Expired</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  To continue generating AI email drafts, publishing LinkedIn research, and managing outreach pipelines, please renew your subscription with Razorpay.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Instant unfreeze of all drafts & leads
                </div>
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Automated GST tax invoice sent to your email
                </div>
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Seamless Razorpay UPI / Cards / Netbanking
                </div>
              </div>

              <Link
                href="/billing"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 hover:opacity-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition-all"
              >
                Choose Plan & Pay with Razorpay <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </>
    );
  }

  // 2. EXPIRING SOON (<= 3 Days): Show Amber Warning Banner
  if (sub.isExpiringSoon && !dismissedWarning) {
    return (
      <div className="mb-6 p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-900 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-amber-950 flex items-center gap-2">
              Subscription Ending Soon • {sub.daysLeft} {sub.daysLeft === 1 ? 'Day' : 'Days'} Remaining
            </h4>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Your {sub.planName} ends on <strong>{new Date(sub.currentPeriodEnd).toLocaleDateString()}</strong>. Renew today to prevent automated email disruption.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
          <Link
            href="/billing"
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-all"
          >
            Renew Plan (₹)
          </Link>
          <button
            onClick={() => setDismissedWarning(true)}
            className="p-1.5 rounded-lg hover:bg-amber-200 text-amber-800 transition-colors"
            title="Dismiss warning"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
