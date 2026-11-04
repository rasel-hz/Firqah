'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, History } from 'lucide-react';
import { createChallenge } from '@/lib/state/store.ts';
import { Logo } from './Brand.tsx';
import { Button } from './ui.tsx';

/** The same navigation everywhere. On the landing hero it sits over the Midnight shape, so its colours change. */
export function SiteHeader({ variant = 'app' }: { variant?: 'app' | 'hero' }) {
  const router = useRouter();
  const hero = variant === 'hero';

  return (
    <div className={`mx-auto flex h-20 max-w-6xl items-center justify-between gap-3 px-4 ${hero ? '' : 'h-16'}`}>
      <Link href="/" aria-label="فِرقة، الصفحة الرئيسية" className={`press rounded-lg hover:opacity-80 ${hero ? 'text-white lg:text-ink' : 'text-ink'}`}>
        <Logo />
      </Link>
      <nav aria-label="التنقل الرئيسي" className="flex items-center gap-2 sm:gap-4">
        <Link
          href="/#challenges"
          aria-label="التحديات السابقة"
          className={`press inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-sm font-medium ${hero ? 'text-white hover:text-lime' : 'text-muted hover:text-ink'}`}
        >
          <History className="size-5" aria-hidden />
          <span className="max-sm:sr-only">التحديات السابقة</span>
        </Link>
        <Button onClick={() => router.push(`/challenge/${createChallenge().id}`)} className="min-h-11 px-4 sm:px-5">
          أنشئ تحديًا
          <ArrowLeft className="size-4" aria-hidden />
        </Button>
      </nav>
    </div>
  );
}
