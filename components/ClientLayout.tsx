'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import SubscriptionAlert from '@/components/SubscriptionAlert';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === '/' || pathname === '/login' || pathname === '/signup';

  return (
    <div className="min-h-screen flex antialiased selection:bg-indigo-100 selection:text-indigo-900 bg-[#FAFAFC] text-slate-900 w-full font-sans">
      {!isPublicPage && <Sidebar />}
      <main className={`flex-1 min-w-0 overflow-y-auto min-h-screen bg-[#FAFAFC] transition-all duration-300 ${isPublicPage ? 'p-0 w-full' : 'p-4 sm:p-8'}`}>
        {!isPublicPage && <SubscriptionAlert />}
        {children}
      </main>
    </div>
  );
}
