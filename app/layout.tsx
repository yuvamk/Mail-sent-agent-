import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'ReachOut AI - Personal Job Outreach Automation Platform',
  description: 'AI-assisted job outreach platform with strict manual approval and SMTP email dispatch.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex antialiased selection:bg-cyan-500 selection:text-white">
        <Sidebar />
        <main className="flex-1 overflow-y-auto min-h-screen bg-slate-950 p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
