import type { ReactNode } from 'react';
import { SiteHeader } from '@/components/SiteHeader.tsx';

export default function ChallengeLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur">
        <SiteHeader />
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </>
  );
}
