'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Users } from 'lucide-react';
import { Button, Card, EmptyState, Loading } from '@/components/ui.tsx';
import { createChallenge, deleteChallenge, loadSavedChallenges } from '@/lib/state/store.ts';
import type { Challenge } from '@/lib/state/types.ts';

export default function HomePage() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[] | null>(null);

  useEffect(() => setChallenges(loadSavedChallenges()), []);

  function create() {
    router.push(`/challenge/${createChallenge().id}`);
  }

  function remove(challenge: Challenge) {
    if (window.confirm(`حذف «${challenge.name || 'تحدٍ بلا اسم'}» نهائيًا؟`)) setChallenges(deleteChallenge(challenge.id));
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4 py-4 sm:py-8">
        <h1 className="text-3xl font-bold sm:text-4xl">كوّن فرقًا تناسب المهمة، لا مجرد مجموعات متساوية العدد.</h1>
        <p className="max-w-2xl text-muted">
          لمنظمي الهاكاثونات والمعسكرات والمسابقات الجامعية. يفهم Llama التحدي وأوصاف المشاركين، ثم يكوّن الكود الفرق
          ويحسب الدرجات ويتحقق من الشروط.
        </p>
        <Button onClick={create}>
          <Plus className="size-4" aria-hidden />
          إنشاء تحدٍ
        </Button>
      </section>

      <section aria-labelledby="saved-heading" className="space-y-3">
        <h2 id="saved-heading" className="text-lg font-bold">
          التحديات المحفوظة
        </h2>
        {challenges === null ? (
          <Loading label="جارٍ التحميل..." />
        ) : challenges.length === 0 ? (
          <EmptyState title="لا توجد تحديات بعد">أنشئ تحديًا للبدء. تُحفظ البيانات في هذا المتصفح فقط.</EmptyState>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {challenges.map((challenge) => (
              <li key={challenge.id}>
                <Card className="flex items-start justify-between gap-3">
                  <Link href={`/challenge/${challenge.id}`} className="min-w-0 flex-1 hover:text-accent-soft">
                    <p className="font-medium break-words">{challenge.name || 'تحدٍ بلا اسم'}</p>
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                      <Users className="size-4" aria-hidden />
                      {challenge.participants.length} مشارك · {challenge.teamCount} فرق
                    </p>
                  </Link>
                  <Button variant="ghost" aria-label={`حذف ${challenge.name || 'التحدي'}`} onClick={() => remove(challenge)}>
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
