import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Space_Grotesk, Tajawal } from 'next/font/google';
import './globals.css';

// Tajawal has no 600, so semibold text uses its 700.
const arabic = Tajawal({
  subsets: ['arabic'],
  weight: ['400', '500', '700'],
  variable: '--font-arabic',
});

const latin = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-latin',
});

// Each font's generated fallback is Arial, which has Arabic letters and would take them before Tajawal gets a chance.
// So the stack names only the real fonts: Space Grotesk covers Latin, and Tajawal takes the Arabic it leaves.
const realFamily = (font: { style: { fontFamily: string } }) => font.style.fontFamily.split(',')[0];
const fontStack = `${realFamily(latin)}, ${realFamily(arabic)}, system-ui, sans-serif`;

export const metadata: Metadata = {
  title: 'فِرقة',
  description: 'كل تحدٍ له فريقه، وفِرقة تعرف كيف تجمعهم.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${arabic.variable} ${latin.variable}`} style={{ '--font-stack': fontStack } as React.CSSProperties}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
