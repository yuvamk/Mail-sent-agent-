'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
  ShieldCheck,
  CreditCard,
  Clock,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
  badgeColor?: string;
}

const baseNavItems: NavItem[] = [
  { name: 'Leads Dashboard', href: '/leads', icon: Users },
  { name: 'Import Excel', href: '/import', icon: FileSpreadsheet },
  { name: 'Resume Manager', href: '/resume', icon: FileText },
  { name: 'Draft Review Queue', href: '/review', icon: MailCheck },
  { name: 'LinkedIn Studio', href: '/linkedin', icon: Linkedin },
  { name: 'Sent History', href: '/sent', icon: Send },
  { name: 'Token Analytics (₹)', href: '/analytics', icon: BarChart3 },
  { name: 'Billing & Plans', href: '/billing', icon: CreditCard },
  { name: 'Settings & Prompts', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [subStatus, setSubStatus] = useState<string | null>(null);

  // Restore collapsed preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('reachout_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch {
      // localStorage may be disabled
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
      const email = session?.user?.email || null;
      setUserEmail(email);
      checkAdminStatus(email);
      if (email) fetchSubBadge();
    });

    const { data: authListener } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      const email = session?.user?.email || null;
      setUserEmail(email);
      checkAdminStatus(email);
      if (email) fetchSubBadge();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchSubBadge = async () => {
    try {
      const res = await fetch('/api/payment/status');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.subscription) {
          setSubStatus(data.subscription.isAdmin ? 'VIP' : data.subscription.status);
        }
      }
    } catch {
      // ignore
    }
  };

  const checkAdminStatus = (email: string | null) => {
    if (!email) {
      setIsAdmin(false);
      return;
    }
    const adminEmails = ['yuvamk6@gmail.com'];
    setIsAdmin(adminEmails.includes(email.toLowerCase()));
  };

  const navItems = useMemo(() => {
    if (!isAdmin) return baseNavItems;
    return [
      ...baseNavItems,
      { name: 'Admin Dashboard', href: '/admin', icon: ShieldCheck, badge: 'ADMIN', badgeColor: 'bg-rose-50 text-rose-700 border-rose-200' },
    ];
  }, [isAdmin]);

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
    setIsAdmin(false);
    router.push('/login');
  };

  // Hide sidebar completely on Landing page, Login page, and Signup page
  if (pathname === '/' || pathname === '/login' || pathname === '/signup') {
    return null;
  }

  return (
    <aside
      className={`relative bg-white border-r border-slate-200 flex flex-col justify-between h-screen sticky top-0 text-slate-800 z-30 transition-all duration-300 ease-in-out shrink-0 select-none shadow-[2px_0_10px_rgba(0,0,0,0.02)] ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Branding & Navigation */}
      <div>
        {/* Brand Header */}
        <div className={`flex items-center justify-between border-b border-slate-100 transition-all duration-300 ${isCollapsed ? 'p-3 flex-col gap-3' : 'p-4'}`}>
          {isCollapsed ? (
            /* Collapsed Brand Icon & Open Button */
            <div className="flex flex-col items-center gap-2 group relative">
              <button
                onClick={toggleSidebar}
                id="btn-sidebar-toggle-collapsed"
                title="Open sidebar 🐱 (⌘B)"
                aria-label="Open sidebar"
                className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
              >
                <Sparkles className="w-5 h-5 text-white" />
              </button>
              {/* Floating Tooltip */}
              <div className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-white text-slate-900 text-xs font-semibold rounded-lg shadow-xl border border-slate-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 z-50 translate-x-1 group-hover:translate-x-0 flex items-center gap-1.5">
                <span>Open sidebar (⌘B)</span>
              </div>
            </div>
          ) : (
            <>
              {/* Brand Details */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0 overflow-hidden">
                  <h1 className="font-extrabold text-base leading-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-950 via-slate-800 to-slate-700 truncate">
                    ReachOut AI
                  </h1>
                  <p className="text-[11px] text-indigo-600 font-semibold flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-indigo-600 shrink-0" /> v2.0 Platform
                  </p>
                </div>
              </div>
              {/* Toggle Button */}
              <button
                onClick={toggleSidebar}
                id="btn-sidebar-toggle"
                title="Collapse sidebar 🐱 (⌘B)"
                aria-label="Collapse sidebar"
                className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 hover:scale-110 active:scale-95 transition-all duration-200 shrink-0 group cursor-pointer"
              >
                <Cat className="w-5 h-5 transition-transform duration-200 group-hover:rotate-12" />
              </button>
            </>
          )}
        </div>

        {/* Navigation Items */}
        <nav className={`py-4 space-y-1 ${isCollapsed ? 'px-2' : 'px-3'}`}>
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
                        ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 font-bold shadow-xs'
                        : item.badge
                        ? 'text-rose-600 hover:bg-rose-50'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-indigo-600' : item.badge ? 'text-rose-600' : 'text-slate-500 group-hover:text-slate-800'}`} />
                  </Link>

                  {/* Floating Tooltip */}
                  <div className="pointer-events-none absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-white text-slate-900 text-xs font-semibold rounded-lg shadow-xl border border-slate-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 z-50 translate-x-1 group-hover:translate-x-0 flex items-center gap-2">
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                id={`nav-link-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-xs'
                    : item.badge
                    ? 'text-rose-700 hover:bg-rose-50 border border-rose-200 font-semibold'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600' : item.badge ? 'text-rose-600' : 'text-slate-500'}`} />
                <span className="truncate">{item.name}</span>
                {item.badge && (
                  <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    {item.badge}
                  </span>
                )}
                {item.href === '/billing' && subStatus && (
                  <span
                    className={`ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                      subStatus === 'active' || subStatus === 'VIP'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : subStatus === 'trial'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {subStatus}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Session & Logout Footer */}
      <div className={`border-t border-slate-100 transition-all duration-300 ${isCollapsed ? 'p-2 space-y-3' : 'p-4 space-y-3'}`}>
        {userEmail ? (
          <div className="space-y-2">
            {isCollapsed ? (
              <>
                {/* Collapsed User Email Icon */}
                <div className="relative group flex justify-center">
                  <div
                    className="w-12 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-indigo-600 cursor-default"
                    title={userEmail}
                  >
                    <UserCheck className="w-5 h-5 shrink-0" />
                  </div>
                  <div className="pointer-events-none absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-white text-slate-900 text-xs font-mono rounded-lg shadow-xl border border-slate-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 z-50 translate-x-1 group-hover:translate-x-0">
                    {userEmail}
                  </div>
                </div>

                {/* Collapsed Logout */}
                <div className="relative group flex justify-center">
                  <button
                    onClick={handleLogout}
                    id="btn-sidebar-logout"
                    aria-label="Logout"
                    className="w-12 h-10 rounded-xl bg-white hover:bg-rose-50 border border-slate-200 text-slate-600 hover:text-rose-600 flex items-center justify-center transition-colors shadow-xs"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                  <div className="pointer-events-none absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-white text-rose-600 text-xs font-semibold rounded-lg shadow-xl border border-rose-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 z-50 translate-x-1 group-hover:translate-x-0">
                    Logout
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Expanded User Email Badge */}
                <div className="flex items-center justify-between text-xs text-slate-700 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-2 min-w-0">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate font-mono text-[11px]" title={userEmail}>
                      {userEmail}
                    </span>
                  </div>
                  {subStatus && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        subStatus === 'active' || subStatus === 'VIP'
                          ? 'bg-emerald-50 text-emerald-700'
                          : subStatus === 'trial'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {subStatus}
                    </span>
                  )}
                </div>

                {/* Expanded Logout Button */}
                <button
                  onClick={handleLogout}
                  id="btn-sidebar-logout"
                  className="w-full px-3 py-2 rounded-xl bg-white hover:bg-rose-50 hover:border-rose-200 border border-slate-200 text-slate-600 hover:text-rose-700 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs"
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
                  className="w-12 h-10 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 flex items-center justify-center transition-all"
                >
                  <LogIn className="w-4 h-4" />
                </Link>
                <div className="pointer-events-none absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-white text-indigo-600 text-xs font-semibold rounded-lg shadow-xl border border-slate-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 z-50 translate-x-1 group-hover:translate-x-0">
                  Login / Sign Up
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                id="btn-sidebar-login"
                className="w-full px-3 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:opacity-95 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" /> Login / Sign Up
              </Link>
            )}
          </div>
        )}

        {/* Multi-Tenant Safety Badge */}
        {isCollapsed ? (
          <div className="relative group flex justify-center py-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse cursor-help"></span>
            <div className="pointer-events-none absolute left-full ml-3.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-white text-slate-600 text-[11px] font-medium rounded-lg shadow-xl border border-slate-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-150 z-50 translate-x-1 group-hover:translate-x-0">
              Multi-tenant database RLS isolated
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-slate-50 p-2 text-[10px] text-slate-500 flex items-center gap-1.5 border border-slate-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span className="truncate">Multi-tenant database RLS isolated</span>
          </div>
        )}
      </div>
    </aside>
  );
}
