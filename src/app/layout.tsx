import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { IBM_Plex_Sans_Arabic } from 'next/font/google';
import './globals.css';

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '700'],
  variable: '--font-arabic',
});

export const metadata: Metadata = {
  title: 'فِرقة',
  description: 'كوّن فرقًا تناسب المهمة، لا مجرد مجموعات متساوية العدد.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={arabic.variable}>
      <body className="min-h-screen font-sans">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-3">
            <Link href="/" className="text-xl font-bold text-ink hover:text-accent-soft">
              فِرقة
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
      </body>
    </html>
  );
}
