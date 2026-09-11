'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Users,
  Coins,
  IndianRupee,
  Cpu,
  Sparkles,
  Loader2,
  Zap,
  Building,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface TokenMetrics {
  totalUsers: number;
  totalGenerations: number;
  tokens: {
    today: number;
    month: number;
    allTime: number;
    input: number;
    output: number;
  };
  billingINR: {
    today: number;
    month: number;
    allTime: number;
    avgPerEmail: number;
  };
  modelBreakdown: Record<string, { count: number; totalTokens: number; costINR: number }>;
}

interface LogEntry {
  id: string;
  provider: string;
  model_name: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  estimated_cost_inr: string;
  created_at: string;
  leads?: {
    company: string;
    email: string | null;
  };
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<TokenMetrics | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/analytics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        setLogs(data.recentLogs || []);
      }
    } catch (e) {
      console.error('Failed to fetch analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-emerald-400" /> AI Tokenization & Billing Dashboard (INR ₹)
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Monitor multi-tenant user counts, daily/monthly AI token consumption, and per-email generation billing in Indian Rupees (₹).
        </p>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mx-auto mb-2" />
          Loading real-time token metrics and billing calculations...
        </div>
      ) : metrics ? (
        <div className="space-y-8">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Active Platform Users</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-3xl font-extrabold text-white">{metrics.totalUsers}</p>
              <p className="text-xs text-slate-500">Multi-tenant data isolated</p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Tokens Consumed Today</span>
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-3xl font-extrabold text-white">{metrics.tokens.today.toLocaleString()}</p>
              <p className="text-xs text-slate-500">{metrics.tokens.month.toLocaleString()} tokens this month</p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Billing Spent Today (₹)</span>
                <IndianRupee className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-3xl font-extrabold text-emerald-400">₹{metrics.billingINR.today.toFixed(2)}</p>
              <p className="text-xs text-slate-500">₹{metrics.billingINR.month.toFixed(2)} this month</p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 shadow-xl">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Avg Cost / Email</span>
                <TrendingUp className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-3xl font-extrabold text-cyan-400">₹{metrics.billingINR.avgPerEmail.toFixed(4)}</p>
              <p className="text-xs text-slate-500">Per outreach email generated</p>
            </div>
          </div>

          {/* Token & Billing Breakdown Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Input vs Output Tokens */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 shadow-xl">
              <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Coins className="w-4 h-4 text-amber-400" /> Token Volume Summary
              </h2>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400">Total Input Tokens (Resume + Prompts):</span>
                  <p className="text-xl font-bold text-white">{metrics.tokens.input.toLocaleString()}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400">Total Output Tokens (Generated Emails):</span>
                  <p className="text-xl font-bold text-cyan-300">{metrics.tokens.output.toLocaleString()}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400">Grand Total Tokens All-Time:</span>
                  <p className="text-2xl font-extrabold text-emerald-400">{metrics.tokens.allTime.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Right: AI Model Cost Breakdown */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 shadow-xl">
              <h2 className="text-base font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                <Cpu className="w-4 h-4 text-indigo-400" /> AI Model Efficiency & INR Billing
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(metrics.modelBreakdown).map(([model, data]) => (
                  <div key={model} className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs font-mono">{model}</span>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 text-[10px] font-semibold">
                        {data.count} calls
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-slate-400">
                      <p>
                        Total Tokens: <strong className="text-slate-200">{data.totalTokens.toLocaleString()}</strong>
                      </p>
                      <p>
                        Total Cost: <strong className="text-emerald-400">₹{data.costINR.toFixed(4)}</strong>
                      </p>
                      <p>
                        Avg Cost/Call:{' '}
                        <strong className="text-cyan-400">
                          ₹{(data.count > 0 ? data.costINR / data.count : 0).toFixed(4)}
                        </strong>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Detailed Token Logs Table */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" /> Recent AI Tokenization Output/Input Logs
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono uppercase">
                  <tr>
                    <th className="p-3">Company</th>
                    <th className="p-3">Model</th>
                    <th className="p-3 text-right">Input Tokens</th>
                    <th className="p-3 text-right">Output Tokens</th>
                    <th className="p-3 text-right">Total Tokens</th>
                    <th className="p-3 text-right">Cost (₹)</th>
                    <th className="p-3 text-center">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                        No AI email drafts generated yet. Token logs will appear here.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/40 font-mono text-[11px]">
                        <td className="p-3 font-sans font-bold text-white flex items-center gap-2">
                          <Building className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          {log.leads?.company || 'Lead'}
                        </td>
                        <td className="p-3 text-indigo-300">{log.model_name}</td>
                        <td className="p-3 text-right text-slate-400">{log.input_tokens.toLocaleString()}</td>
                        <td className="p-3 text-right text-slate-400">{log.output_tokens.toLocaleString()}</td>
                        <td className="p-3 text-right font-bold text-amber-400">{log.total_tokens.toLocaleString()}</td>
                        <td className="p-3 text-right font-bold text-emerald-400">
                          ₹{parseFloat(log.estimated_cost_inr).toFixed(4)}
                        </td>
                        <td className="p-3 text-center text-slate-500">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
