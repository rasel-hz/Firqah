'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { PiecesBand, PiecesPanel, StepArt } from '@/components/Pieces.tsx';
import { Button } from '@/components/ui.tsx';
import { createChallenge, deleteChallenge, loadSavedChallenges } from '@/lib/state/store.ts';
import type { Challenge } from '@/lib/state/types.ts';

const STEPS = [
  { art: 'needs', title: 'تحدد ما تحتاجه المهمة', text: 'تصف التحدي، فيقترح Llama المهارات المطلوبة وأوزانها. تعدّلها كما تشاء، وأنت من يعتمد الشروط الإلزامية.' },
  { art: 'people', title: 'تعرف ما يملكه كل مشارك', text: 'ترفع الأوصاف، فيستخرج Llama المهارات مع دليلها من كلام الشخص. وما لم يُذكر يبقى مجهولًا حتى تؤكده.' },
  { art: 'complete', title: 'تتكوّن فرق مكتملة', text: 'يوزّع الكود المشاركين ويحسب الدرجات، ويوضح لكل فريق ما اكتمل وما لم يتأكد وما ينقصه.' },
] as const;

export default function HomePage() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  useEffect(() => setChallenges(loadSavedChallenges()), []);

  function create() {
    router.push(`/challenge/${createChallenge().id}`);
  }

  function remove(challenge: Challenge) {
    if (window.confirm(`حذف «${challenge.name || 'تحدٍ بلا اسم'}» نهائيًا؟`)) setChallenges(deleteChallenge(challenge.id));
  }

  return (
    <div className="text-base leading-relaxed sm:text-lg">
      <section className="grid grid-cols-1 items-center gap-10 pt-4 pb-12 sm:pt-8 lg:grid-cols-12 lg:pb-16">
        <div className="lg:col-span-7">
          <h1 className="font-display text-[112px] leading-[1.15] font-bold sm:text-[168px] lg:text-[192px]">فرقة</h1>
          <p className="mt-4 max-w-xl text-2xl leading-snug font-medium sm:text-[32px]">
            كوّن فرقًا تناسب المهمة، لا مجرد مجموعات متساوية العدد.
          </p>
          <Button onClick={create} className="mt-8 min-h-12 px-7 text-base">
            أنشئ تحديًا
            <ArrowLeft className="size-4" aria-hidden />
          </Button>
        </div>
        <div className="max-w-md max-lg:mx-auto max-lg:w-full lg:col-span-5 lg:max-w-none">
          <PiecesPanel />
        </div>
      </section>

      {challenges.length > 0 ? (
        <section aria-labelledby="saved-heading" className="mt-8">
          <h2 id="saved-heading" className="text-xl font-semibold">تحدياتك</h2>
          <ul className="mt-3 space-y-2">
            {challenges.map((challenge) => (
              <li key={challenge.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface ps-4 pe-2">
                <Link href={`/challenge/${challenge.id}`} className="press flex min-h-14 min-w-0 flex-1 flex-wrap items-center gap-x-3 text-base hover:text-muted">
                  <span className="font-medium break-words">{challenge.name || 'تحدٍ بلا اسم'}</span>
                  <span className="text-sm text-muted">
                    <span className="num">{challenge.participants.length}</span> مشارك · <span className="num">{challenge.teamCount}</span> فرق
                  </span>
                </Link>
                <Button variant="ghost" aria-label={`حذف ${challenge.name || 'التحدي'}`} onClick={() => remove(challenge)}>
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="idea-heading" className="mt-20 grid grid-cols-1 gap-6 lg:mt-32 lg:grid-cols-12">
        <h2 id="idea-heading" className="reveal font-display text-[44px] leading-[1.2] font-bold sm:text-[64px] lg:col-span-7">كل فريق يكتمل بمهاراته</h2>
        <p className="reveal text-muted lg:col-span-5 lg:pt-3">
          التوزيع بالعدد قد يجمع المبرمجين في فريق ويترك فريقًا آخر بلا مصمم. فِرقة تساعد منظمي الهاكاثونات والمعسكرات والمسابقات الجامعية في السعودية على توزيع المهارات، حتى يملك كل فريق ما تحتاجه المهمة.
        </p>
      </section>

      <section aria-labelledby="how-heading" className="mt-20 lg:mt-32">
        <h2 id="how-heading" className="reveal font-display text-[32px] leading-tight font-bold sm:text-[44px]">من الوصف إلى الفريق</h2>
        <ol className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((step) => (
            <li key={step.title} className="reveal">
              <div className="w-40"><StepArt name={step.art} /></div>
              <h3 className="mt-5 text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="split-heading" className="bleed mt-20 bg-madder lg:mt-32">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-8 px-4 py-16 lg:grid-cols-12 lg:py-24">
          <h2 id="split-heading" className="reveal font-display text-[44px] leading-[1.2] font-bold sm:text-[64px] lg:col-span-7">الذكاء يفهم، والكود يقرر</h2>
          <p className="reveal lg:col-span-5">
            Llama يقرأ النصوص ويكتب المراجعات، ولا يوزّع أحدًا على فريق ولا يحسب درجة. الكود يكوّن الفرق ويطبّق شروطك، وإذا كان الشرط مستحيلًا يخبرك بالسبب بدل أن يخالفه.
          </p>
        </div>
      </section>

      <section aria-labelledby="start-heading" className="py-20 lg:py-32">
        <h2 id="start-heading" className="reveal font-display text-[44px] leading-[1.2] font-bold sm:text-[64px]">ابدأ بتحديك الأول</h2>
        <Button onClick={create} className="mt-8 min-h-12 px-7 text-base">
          أنشئ تحديًا
          <ArrowLeft className="size-4" aria-hidden />
        </Button>
      </section>

      <footer className="bleed">
        <PiecesBand id="pieces-foot" height={48} />
        <p className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted">فِرقة. نقش مستوحى من الزخارف الهندسية، وتحدياتك تُحفظ في متصفحك فقط.</p>
      </footer>
    </div>
  );
}
