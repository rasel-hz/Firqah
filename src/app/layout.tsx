import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { IBM_Plex_Sans_Arabic, Reem_Kufi } from 'next/font/google';
import { PiecesMark } from '@/components/Pieces.tsx';
import './globals.css';

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600'],
  variable: '--font-arabic',
});

const kufi = Reem_Kufi({
  subsets: ['arabic', 'latin'],
  weight: ['500', '600', '700'],
  variable: '--font-kufi',
});

export const metadata: Metadata = {
  title: 'فِرقة',
  description: 'كوّن فرقًا تناسب المهمة، لا مجرد مجموعات متساوية العدد.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${arabic.variable} ${kufi.variable}`}>
      <body className="min-h-screen font-sans">
        <header>
          <div className="mx-auto flex h-16 max-w-6xl items-center px-4">
            <Link href="/" className="press flex items-center gap-2 font-display text-xl font-bold text-ink hover:text-muted">
              <PiecesMark />
              فرقة
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
