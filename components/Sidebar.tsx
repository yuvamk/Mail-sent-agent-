'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import {
  Users,
  FileSpreadsheet,
  FileText,
  MailCheck,
  Send,
  BarChart3,
  Settings,
  Sparkles,
  Zap,
  LogOut,
  LogIn,
  UserCheck,
} from 'lucide-react';

const navItems = [
  { name: 'Leads Dashboard', href: '/leads', icon: Users },
  { name: 'Import Excel', href: '/import', icon: FileSpreadsheet },
  { name: 'Resume Manager', href: '/resume', icon: FileText },
  { name: 'Draft Review Queue', href: '/review', icon: MailCheck },
  { name: 'Sent History', href: '/sent', icon: Send },
  { name: 'Token Analytics (₹)', href: '/analytics', icon: BarChart3 },
  { name: 'Settings & Prompts', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email || null);
    });

    const { data: authListener } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabaseBrowser.auth.signOut();
    setUserEmail(null);
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-screen sticky top-0 text-slate-100 z-30">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
              ReachOut AI
            </h1>
            <p className="text-xs text-cyan-400 font-medium flex items-center gap-1">
              <Zap className="w-3 h-3 fill-cyan-400" /> Manual Approval
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (pathname === '/' && item.href === '/leads');
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                id={`nav-link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600/90 to-indigo-600/90 text-white shadow-md shadow-blue-600/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-cyan-300' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Session & Logout Bar */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        {userEmail ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-300 px-2 py-1.5 rounded-lg bg-slate-800/60">
              <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate font-mono text-[11px]" title={userEmail}>
                {userEmail}
              </span>
            </div>
            <button
              onClick={handleLogout}
              id="btn-sidebar-logout"
              className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-red-950/60 hover:border-red-800 border border-slate-700/50 text-slate-300 hover:text-red-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            id="btn-sidebar-login"
            className="w-full px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-cyan-300 text-xs font-bold flex items-center justify-center gap-2 transition-all"
          >
            <LogIn className="w-3.5 h-3.5" /> Login / Sign Up
          </Link>
        )}

        {/* Safety Notice */}
        <div className="rounded-xl bg-slate-950/40 p-2.5 text-[10px] text-slate-500 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Multi-tenant database RLS isolated</span>
        </div>
      </div>
    </aside>
  );
}

