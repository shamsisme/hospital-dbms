import './globals.css';
import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import { ToastProvider } from '@/components/ToastContext';

export const metadata: Metadata = {
  title: 'Hospital Bed & Emergency Resource Management System (CHR-MS)',
  description:
    'Centralized clinical bed occupancy, emergency triage intake, patient discharge, and departmental analytics dashboard powered by PostgreSQL.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <ToastProvider>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 pb-16">{children}</main>
            <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
              <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">Hospital Bed & Emergency Resource Management</span>
                  <span>•</span>
                  <span>PostgreSQL Native Connection Pool (`pg`)</span>
                </div>
                <div className="flex items-center gap-4 text-slate-400">
                  <span>DB: hospital_db</span>
                  <span>Port: 5432</span>
                  <span>Host: localhost</span>
                </div>
              </div>
            </footer>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
