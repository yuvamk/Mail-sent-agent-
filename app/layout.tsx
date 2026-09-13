import type { Metadata } from 'next';
import './globals.css';
import ClientLayout from '@/components/ClientLayout';

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
    <html lang="en">
      <body className="bg-[#FAFAFC] text-slate-900 min-h-screen antialiased selection:bg-indigo-500 selection:text-white">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
