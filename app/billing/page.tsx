'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { supabaseBrowser } from '@/lib/supabase-browser';
import {
  CreditCard,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  Clock,
  AlertTriangle,
  FileText,
  Mail,
  RefreshCw,
  Award,
  Layers,
  Check,
  Building,
  User,
  ExternalLink,
} from 'lucide-react';
import { SubscriptionStatus, SUBSCRIPTION_PLANS } from '@/lib/subscription-plans';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function BillingPage() {
  const [sub, setSub] = useState<SubscriptionStatus | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      }
    });

    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/payment/status');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.subscription) {
          setSub(data.subscription);
        }
      }
    } catch (err: any) {
      console.warn('Failed to load status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    setProcessingPlan(planId);
    setErrorMessage(null);
    setPaymentSuccess(null);

    try {
      // 1. Create Order on Server
      const orderRes = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.error || 'Failed to initialize payment');
      }

      // 2. Open Razorpay Modal or Handle Test Mode
      if (typeof window !== 'undefined' && window.Razorpay && !orderData.isDemoMode) {
        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'ReachOut AI',
          description: `${orderData.planName} Subscription`,
          image: 'https://mail-sent-agent.onrender.com/logo.png',
          order_id: orderData.orderId,
          handler: async function (response: any) {
            await verifyPayment({
              orderId: response.razorpay_order_id || orderData.orderId,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              planId: orderData.planId,
            });
          },
          prefill: {
            email: userEmail || '',
          },
          theme: {
            color: '#4f46e5',
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp: any) {
          setErrorMessage(resp.error?.description || 'Payment was cancelled or failed.');
          setProcessingPlan(null);
        });
        rzp.open();
      } else {
        // Test / Demo Mode Instant Verification
        await verifyPayment({
          orderId: orderData.orderId,
          paymentId: `pay_demo_${Date.now()}`,
          signature: 'verified_demo_checkout',
          planId: orderData.planId,
        });
      }
    } catch (err: any) {
      console.error('[handleSubscribe error]:', err);
      setErrorMessage(err?.message || 'Payment initiation failed.');
      setProcessingPlan(null);
    }
  };

  const verifyPayment = async (payload: any) => {
    try {
      const verifyRes = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || 'Verification failed');
      }

      setPaymentSuccess(verifyData.subscription);
      await fetchStatus();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Verification error');
    } finally {
      setProcessingPlan(null);
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="max-w-7xl mx-auto space-y-8 pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-2">
              <CreditCard className="w-3.5 h-3.5 text-indigo-600" /> Razorpay Subscription Engine
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950">Subscription & Billing Management</h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Select your career growth plan. Invoices with full breakdown are automatically dispatched to your email.
            </p>
          </div>

          <button
            onClick={fetchStatus}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors self-start"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${loading ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
        </div>

        {/* Payment Success Banner */}
        {paymentSuccess && (
          <div className="p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 shadow-md space-y-2 animate-in fade-in">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              🎉 Subscription Activated: {paymentSuccess.planName}
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Your service pipelines have been unpaused and are active until{' '}
              <strong>{new Date(paymentSuccess.validUntil).toLocaleDateString()}</strong>. An official tax invoice (
              <strong>{paymentSuccess.invoiceNumber}</strong>) has been dispatched to <strong>{userEmail}</strong>!
            </p>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            {errorMessage}
          </div>
        )}

        {/* Current Plan Overview Card */}
        {sub && (
          <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="space-y-1">
                <span className="text-[11px] font-mono text-slate-500 uppercase font-bold">Active Account Plan</span>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-950">{sub.planName}</h2>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                      sub.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : sub.status === 'expiring_soon'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : sub.status === 'trial'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {sub.status === 'expiring_soon' ? 'EXPIRING SOON' : sub.status}
                  </span>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-[11px] font-mono text-slate-500 uppercase font-bold">Time Remaining</span>
                <div className="text-lg font-black text-indigo-700 flex items-center sm:justify-end gap-1.5">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  {sub.isAdmin ? 'Unlimited VIP' : `${sub.daysLeft} Days Left`}
                </div>
                <div className="text-[11px] text-slate-500">
                  Renews on: {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Feature Status Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 text-[10px] font-bold uppercase">AI Cold Emailing</span>
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${sub.isLocked ? 'text-slate-400' : 'text-emerald-600'}`} />
                  {sub.isLocked ? 'Paused' : 'Active'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 text-[10px] font-bold uppercase">LinkedIn Studio</span>
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${sub.isLocked ? 'text-slate-400' : 'text-emerald-600'}`} />
                  {sub.isLocked ? 'Paused' : 'Active'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 text-[10px] font-bold uppercase">Gemini 3-Key Pool</span>
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${sub.isLocked ? 'text-slate-400' : 'text-emerald-600'}`} />
                  {sub.isLocked ? 'Paused' : '3 Keys Active'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 text-[10px] font-bold uppercase">Inbound IMAP Radar</span>
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className={`w-3.5 h-3.5 ${sub.isLocked ? 'text-slate-400' : 'text-emerald-600'}`} />
                  {sub.isLocked ? 'Paused' : 'Listening'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Plans Grid */}
        <div className="space-y-4">
          <div className="text-center sm:text-left space-y-1">
            <h2 className="text-xl font-black text-slate-950">Choose Your Plan</h2>
            <p className="text-xs text-slate-600">
              Payments processed securely in Indian Rupees (₹) via Razorpay. All cards, UPI, and Netbanking supported.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Pro Monthly */}
            <div className="p-7 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6 hover:border-indigo-300 transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-950">Pro Career Monthly</h3>
                  <p className="text-xs text-slate-500">Most flexible choice for fast job hunting</p>
                </div>
                <div className="text-3xl font-black text-slate-950">
                  ₹499 <span className="text-xs text-slate-500 font-normal">/ month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                  {SUBSCRIPTION_PLANS.pro_monthly.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleSubscribe('pro_monthly')}
                disabled={processingPlan !== null}
                className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {processingPlan === 'pro_monthly' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    Subscribe Monthly (₹499) <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {/* 2. Pro Annual (Best Value) */}
            <div className="p-7 rounded-3xl bg-gradient-to-b from-indigo-50/60 via-white to-white border-2 border-indigo-600 shadow-xl shadow-indigo-500/10 space-y-6 relative flex flex-col justify-between">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider">
                Best Value • Save 17%
              </span>
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-950">Pro Career Annual</h3>
                  <p className="text-xs text-slate-500">12 months continuous authority & job pipeline</p>
                </div>
                <div className="text-3xl font-black text-slate-950">
                  ₹4,999 <span className="text-xs text-slate-500 font-normal">/ year</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
                  {SUBSCRIPTION_PLANS.pro_annual.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-indigo-600 font-bold shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleSubscribe('pro_annual')}
                disabled={processingPlan !== null}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-violet-600 hover:opacity-95 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
              >
                {processingPlan === 'pro_annual' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    Subscribe Annual (₹4,999) <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {/* 3. Enterprise Agency */}
            <div className="p-7 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6 hover:border-indigo-300 transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-950">Enterprise Agency</h3>
                  <p className="text-xs text-slate-500">For multi-seat teams and high-scale recruiting</p>
                </div>
                <div className="text-3xl font-black text-slate-950">
                  ₹1,499 <span className="text-xs text-slate-500 font-normal">/ month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-slate-600 font-medium">
                  {SUBSCRIPTION_PLANS.enterprise.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => handleSubscribe('enterprise')}
                disabled={processingPlan !== null}
                className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                {processingPlan === 'enterprise' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    Subscribe Enterprise (₹1,499) <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Invoice & Guarantee Notice */}
        <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">Instant Automated Invoices</h4>
              <p className="text-[11px] text-slate-500">
                Every transaction automatically generates an itemized tax invoice delivered directly to your email.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl shrink-0">
            Powered by Razorpay Secure
          </span>
        </div>
      </div>
    </>
  );
}
