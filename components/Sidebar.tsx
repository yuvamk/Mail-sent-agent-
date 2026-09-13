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
  Cat,
  Linkedin,
} from 'lucide-react';

const navItems = [
  { name: 'Leads Dashboard', href: '/leads', icon: Users },
  { name: 'Import Excel', href: '/import', icon: FileSpreadsheet },
  { name: 'Resume Manager', href: '/resume', icon: FileText },
  { name: 'Draft Review Queue', href: '/review', icon: MailCheck },
  { name: 'LinkedIn Studio', href: '/linkedin', icon: Linkedin },
  { name: 'Sent History', href: '/sent', icon: Send },
  { name: 'Token Analytics (₹)', href: '/analytics', icon: BarChart3 },
  { name: 'Settings & Prompts', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Restore collapsed preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('reachout_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch {
      // localStorage may be disabled in some environments
    }
  }, []);

  // Global keyboard shortcut: Cmd+B or Ctrl+B
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('reachout_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleLogout = async () => {
    await supabaseBrowser.auth.signOut();
    setUserEmail(null);
    router.push('/login');
  };

  // Hide sidebar completely on Landing page, Login page, and Signup page
  if (pathname === '/' || pathname === '/login' || pathname === '/signup') {
    return null;
  }

  return (
    <aside
      className={`relative bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-screen sticky top-0 text-slate-100 z-30 transition-all duration-300 ease-in-out shrink-0 select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div>
        {/* Brand Header with Single Cute Toggle Icon Button */}
        <div
          className={`border-b border-slate-800 transition-all duration-300 ${
            isCollapsed ? 'p-3.5 flex justify-center' : 'p-4 sm:p-5 flex items-center justify-between'
          }`}
        >
          {isCollapsed ? (
            /* Single Cute Toggle Button when Collapsed */
            <div className="relative group flex justify-center">
              <button
                onClick={toggleSidebar}
                id="btn-sidebar-toggle"
                title="Open sidebar 🐱 (⌘B)"
                aria-label="Open sidebar"
                className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white hover:shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
              >
                <Cat className="w-6 h-6 transition-transform duration-200 group-hover:rotate-12" />
              </button>
              {/* Tooltip */}
              <div className="pointer-events-none absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900/95 text-slate-100 text-xs font-semibold rounded-lg shadow-2xl border border-slate-700/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 z-50 translate-x-1 group-hover:translate-x-0 flex items-center gap-2 backdrop-blur-md">
                <span>Open sidebar 🐱 (⌘B)</span>
              </div>
            </div>
          ) : (
            <>
              {/* Brand Details */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 overflow-hidden">
                  <h1 className="font-bold text-base leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 truncate">
                    ReachOut AI
                  </h1>
                  <p className="text-[11px] text-cyan-400 font-medium flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-cyan-400 shrink-0" /> Manual Approval
                  </p>
                </div>
              </div>
              {/* Single Cute Toggle Button when Expanded */}
              <button
                onClick={toggleSidebar}
                id="btn-sidebar-toggle"
                title="Collapse sidebar 🐱 (⌘B)"
                aria-label="Collapse sidebar"
                className="p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 hover:scale-110 active:scale-95 transition-all duration-200 shrink-0 group cursor-pointer"
              >
                <Cat className="w-5 h-5 transition-transform duration-200 group-hover:rotate-12" />
              </button>
            </>
          )}
        </div>

        {/* Navigation Items */}
        <nav className={`py-4 space-y-1.5 ${isCollapsed ? 'px-2' : 'px-3'}`}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || (pathname === '/' && item.href === '/leads');
            const Icon = item.icon;

            if (isCollapsed) {
              return (
                <div key={item.name} className="relative group flex justify-center">
                  <Link
                    href={item.href}
                    id={`nav-link-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                    }`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-cyan-300' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  </Link>

                  {/* Floating Tooltip */}
                  <div className="pointer-events-none absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900/95 text-slate-100 text-xs font-semibold rounded-lg shadow-2xl border border-slate-700/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 z-50 translate-x-1 group-hover:translate-x-0 flex items-center gap-2 backdrop-blur-md">
                    <span>{item.name}</span>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                id={`nav-link-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600/90 to-indigo-600/90 text-white shadow-md shadow-blue-600/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-cyan-300' : 'text-slate-400'}`} />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Session & Logout Footer */}
      <div className={`border-t border-slate-800 transition-all duration-300 ${isCollapsed ? 'p-2 space-y-3' : 'p-4 space-y-3'}`}>
        {userEmail ? (
          <div className="space-y-2">
            {isCollapsed ? (
              <>
                {/* Collapsed User Email Icon with Tooltip */}
                <div className="relative group flex justify-center">
                  <div
                    className="w-12 h-10 rounded-xl bg-slate-800/60 flex items-center justify-center text-emerald-400 cursor-default"
                    title={userEmail}
                  >
                    <UserCheck className="w-5 h-5 shrink-0" />
                  </div>
                  <div className="pointer-events-none absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900/95 text-slate-200 text-xs font-mono rounded-lg shadow-2xl border border-slate-700/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 z-50 translate-x-1 group-hover:translate-x-0 backdrop-blur-md">
                    {userEmail}
                  </div>
                </div>

                {/* Collapsed Logout Button with Tooltip */}
                <div className="relative group flex justify-center">
                  <button
                    onClick={handleLogout}
                    id="btn-sidebar-logout"
                    aria-label="Logout"
                    className="w-12 h-10 rounded-xl bg-slate-800 hover:bg-red-950/60 hover:border-red-800 border border-slate-700/50 text-slate-300 hover:text-red-300 flex items-center justify-center transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                  <div className="pointer-events-none absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900/95 text-red-300 text-xs font-semibold rounded-lg shadow-2xl border border-red-900/50 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 z-50 translate-x-1 group-hover:translate-x-0 backdrop-blur-md">
                    Logout
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Expanded User Email Badge */}
                <div className="flex items-center gap-2 text-xs text-slate-300 px-3 py-2 rounded-lg bg-slate-800/60">
                  <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate font-mono text-[11px]" title={userEmail}>
                    {userEmail}
                  </span>
                </div>
                {/* Expanded Logout Button */}
                <button
                  onClick={handleLogout}
                  id="btn-sidebar-logout"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-red-950/60 hover:border-red-800 border border-slate-700/50 text-slate-300 hover:text-red-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" /> Logout
                </button>
              </>
            )}
          </div>
        ) : (
          <div>
            {isCollapsed ? (
              <div className="relative group flex justify-center">
                <Link
                  href="/login"
                  id="btn-sidebar-login"
                  aria-label="Login / Sign Up"
                  className="w-12 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-cyan-300 flex items-center justify-center transition-all"
                >
                  <LogIn className="w-4 h-4" />
                </Link>
                <div className="pointer-events-none absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900/95 text-cyan-300 text-xs font-semibold rounded-lg shadow-2xl border border-slate-700/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 z-50 translate-x-1 group-hover:translate-x-0 backdrop-blur-md">
                  Login / Sign Up
                </div>
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
          </div>
        )}

        {/* Safety Notice */}
        {isCollapsed ? (
          <div className="relative group flex justify-center py-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse cursor-help"></span>
            <div className="pointer-events-none absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900/95 text-slate-400 text-[11px] font-medium rounded-lg shadow-2xl border border-slate-700/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 z-50 translate-x-1 group-hover:translate-x-0 backdrop-blur-md">
              Multi-tenant database RLS isolated
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-slate-950/40 p-2.5 text-[10px] text-slate-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span className="truncate">Multi-tenant database RLS isolated</span>
          </div>
        )}
      </div>
    </aside>
  );
}
