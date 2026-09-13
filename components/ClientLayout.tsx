'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === '/' || pathname === '/login' || pathname === '/signup';

  return (
    <div className="min-h-screen flex antialiased selection:bg-cyan-500 selection:text-white bg-slate-950 text-slate-100 w-full">
      {!isPublicPage && <Sidebar />}
      <main className={`flex-1 min-w-0 overflow-y-auto min-h-screen bg-slate-950 transition-all duration-300 ${isPublicPage ? 'p-0 w-full' : 'p-4 sm:p-8'}`}>
        {children}
      </main>
    </div>
  );
}
