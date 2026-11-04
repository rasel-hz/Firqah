'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BrainCircuit, CalendarDays, ChevronLeft, FileText, PartyPopper, Plus, Trash2, UserRound, Users } from 'lucide-react';
import { AvatarShape, FirqahMark, Logo, PlusShape, Sparkle } from '@/components/Brand.tsx';
import { SiteHeader } from '@/components/SiteHeader.tsx';
import { SkillConstellation } from '@/components/SkillConstellation.tsx';
import { Button, EmptyState, buttonClass } from '@/components/ui.tsx';
import { useScrollReveal } from '@/components/useScrollReveal.ts';
import { createChallenge, deleteChallenge, loadSavedChallenges } from '@/lib/state/store.ts';
import type { Challenge } from '@/lib/state/types.ts';

const STEPS = [
  { Icon: FileText, text: 'وصف التحدي وإضافة المشاركين' },
  { Icon: BrainCircuit, text: 'تحليل المهارات والاحتياجات' },
  { Icon: Users, text: 'تكوين الفرق المتوازنة' },
];

const RECENT_COUNT = 3;
const CARD_TONES = ['violet', 'peach', 'sky', 'lime'] as const;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });

/** From the challenge's own data: it is complete once it has a valid set of teams. */
const isComplete = (challenge: Challenge) => challenge.runs.some((run) => run.result.status === 'ok');

function ChallengeCard({ challenge, index, onRemove }: { challenge: Challenge; index: number; onRemove: () => void }) {
  const complete = isComplete(challenge);
  const name = challenge.name || 'تحدٍ بلا اسم';
  return (
    <li className="scroll-in from-far lift relative flex h-full flex-col gap-5 rounded-card border border-line bg-surface p-5 shadow-card" style={{ '--step': index % RECENT_COUNT } as React.CSSProperties}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/challenge/${challenge.id}`} className="text-base font-semibold break-words after:absolute after:inset-0 after:rounded-card hover:text-violet-deep focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-violet-deep">
            {name}
          </Link>
          <p className="mt-2 flex items-center gap-1.5 text-[13px] text-muted">
            <CalendarDays className="size-4 shrink-0" aria-hidden />
            {formatDate(challenge.createdAt)}
          </p>
        </div>
        <PlusShape tone={CARD_TONES[index % CARD_TONES.length]} className="size-12 shrink-0" />
      </div>

      <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${complete ? 'bg-lime/45 text-good' : 'bg-lavender text-violet-deep'}`}>
        <span className={`size-1.5 rounded-full ${complete ? 'bg-good' : 'bg-violet-deep'}`} aria-hidden />
        {complete ? 'مكتمل' : 'قيد التنفيذ'}
      </span>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3 text-[13px] text-muted">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="flex items-center gap-1.5"><UserRound className="size-4 text-violet-deep" aria-hidden /><span className="num">{challenge.participants.length}</span> مشارك</span>
          <span className="flex items-center gap-1.5"><Users className="size-4 text-violet-deep" aria-hidden /><span className="num">{challenge.teamCount}</span> فرق</span>
        </div>
        <div className="relative z-10 flex items-center gap-1">
          <Button variant="ghost" className="min-h-10 min-w-10 !px-2" aria-label={`حذف ${name}`} onClick={onRemove}>
            <Trash2 className="size-4" aria-hidden />
          </Button>
          <ChevronLeft className="size-7 rounded-full bg-lavender p-1 text-violet-deep" aria-hidden />
        </div>
      </div>
    </li>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[] | null>(null);
  const [showAll, setShowAll] = useState(false);

  useScrollReveal();

  useEffect(() => setChallenges(loadSavedChallenges()), []);

  function create() {
    router.push(`/challenge/${createChallenge().id}`);
  }

  function remove(challenge: Challenge) {
    if (window.confirm(`حذف «${challenge.name || 'تحدٍ بلا اسم'}» نهائيًا؟`)) setChallenges(deleteChallenge(challenge.id));
  }

  const sorted = [...(challenges ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const shown = showAll ? sorted : sorted.slice(0, RECENT_COUNT);

  return (
    <>
      <div className="hero-ground on-dark relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
          <svg viewBox="0 0 1440 800" preserveAspectRatio="none" className="absolute inset-0 size-full">
            <path d="M0 0H980C1030 110 900 180 950 320 990 440 1090 500 1020 620 960 720 760 770 560 744 360 718 170 680 0 742Z" fill="var(--color-midnight)" />
          </svg>
          <span className="drift-fast absolute -top-16 left-[33%] size-44 rounded-full bg-violet/70" />
          <span className="drift-fast absolute top-20 -left-14 size-36 rounded-full bg-violet/35" />
          <span className="absolute bottom-[22%] -left-10 size-24 rounded-full bg-white/15" />
        </div>
        <span aria-hidden className="pointer-events-none absolute -top-24 -left-24 size-64 rounded-full bg-violet/30 blur-2xl lg:hidden" />

        <header className="relative z-40">
          <SiteHeader variant="hero" />
        </header>

        <main className="relative z-10 mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 pt-8 pb-10 lg:grid-cols-2 lg:gap-6 lg:pt-4 lg:pb-32">
          <section aria-labelledby="hero-heading" className="text-white lg:order-2">
            <p className="rise inline-flex items-center gap-2 rounded-full border border-white/30 px-3 py-1.5 text-lime">
              <Sparkle className="size-3.5 text-white" />
              <span className="caption-en">SMART TEAM FORMATION</span>
            </p>
            <h1 id="hero-heading" className="rise mt-6 text-[38px] leading-[1.25] font-bold sm:text-5xl sm:leading-[1.25] lg:text-[40px] xl:text-[46px]" style={{ '--step': 1 } as React.CSSProperties}>
              كل تحدٍ له فريقه.
              <span className="mt-1 block text-lime">وفِرقة تعرف كيف تجمعهم.</span>
            </h1>
            <p className="rise mt-5 max-w-lg text-lg leading-8 text-white/85" style={{ '--step': 2 } as React.CSSProperties}>
              حلّل التحدي، اكتشف المهارات المطلوبة، وكوّن فرقًا متوازنة بالذكاء الاصطناعي.
            </p>
            <div className="rise mt-8 flex flex-wrap gap-3" style={{ '--step': 3 } as React.CSSProperties}>
              <Button onClick={create} className="min-h-13 px-7 text-base font-semibold">
                <Plus className="size-5" aria-hidden />
                أنشئ تحديًا جديدًا
              </Button>
              <Link href="#challenges" className={`${buttonClass('onDark')} min-h-13 px-6`}>
                استعرض التحديات السابقة
              </Link>
            </div>
          </section>

          <div className="drift-slow lg:order-1">
            <SkillConstellation />
          </div>
        </main>

        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" aria-hidden className="block h-10 w-full fill-canvas lg:hidden">
          <path d="M0 60V28C240 0 480 0 720 22S1200 56 1440 22V60Z" />
        </svg>
      </div>

      <div className="mx-auto max-w-6xl space-y-16 px-4 py-14 text-base leading-relaxed lg:space-y-24 lg:py-16">
        <section aria-labelledby="how-heading" className="scroll-in from-far relative overflow-hidden rounded-[32px] border border-white bg-gradient-to-l from-lavender/60 to-surface p-6 shadow-card sm:p-10">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="flex items-center gap-2 text-violet-deep">
                <span className="size-2 rounded-full bg-violet-deep" aria-hidden />
                <span className="caption-en">SKILL CONSTELLATION</span>
              </p>
              <h2 id="how-heading" className="mt-3 text-3xl leading-tight font-bold sm:text-4xl">من الفكرة إلى الفريق.</h2>
              <p className="mt-2 text-muted">عملية ذكية وبسيطة من ثلاث خطوات.</p>
              <ol className="mt-6 divide-y divide-line rounded-2xl border border-line bg-surface/80">
                {STEPS.map(({ Icon, text }, i) => (
                  <li key={text} className="scroll-in from-right flex items-center gap-4 p-4" style={{ '--step': i + 2 } as React.CSSProperties}>
                    <span className="caption-en flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet/35 !text-sm !font-semibold text-violet-deep">0{i + 1}</span>
                    <Icon className="size-5 shrink-0 text-violet-deep" aria-hidden />
                    <span className="font-medium">{text}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-[13px] leading-6 text-muted">AI يفهم النصوص ويقترح، والكود يوزّع المشاركين ويحسب الدرجات، وأنت تعتمد القرار.</p>
            </div>

            <div className="relative mx-auto h-72 w-full max-w-md sm:h-80" aria-hidden>
              <span className="scroll-in from-small absolute top-2 left-[22%] size-0 border-x-[56px] border-b-[90px] border-x-transparent border-b-violet/20" />
              <span className="scroll-in from-small absolute right-4 bottom-2 size-0 rotate-90 border-x-[34px] border-b-[54px] border-x-transparent border-b-violet/35" />
              <svg viewBox="0 0 400 300" className="absolute inset-0 size-full" fill="none">
                <path d="M150 215C170 265 260 262 298 170" stroke="var(--color-violet-deep)" strokeWidth="1.6" strokeDasharray="5 6" className="draw-line" />
                <path d="M92 118C96 150 104 158 112 176" stroke="var(--color-violet-deep)" strokeWidth="1.6" strokeDasharray="5 6" className="draw-line" />
                <path d="M150 62C188 8 256 8 300 66" stroke="var(--color-violet-deep)" strokeWidth="1.6" strokeDasharray="5 6" className="draw-line" />
                <path d="M292 56l9 12 3-15" stroke="var(--color-violet-deep)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="scroll-in from-right absolute top-[8%] right-0 w-[60%]" style={{ '--step': 5 } as React.CSSProperties}>
                <div className="float -rotate-3 rounded-2xl bg-midnight p-5 text-white shadow-lift sm:p-6">
                  <p className="flex items-center gap-2 text-lg font-bold">
                    <PartyPopper className="size-5 text-lime" />
                    فريقك جاهز!
                  </p>
                  <p className="mt-2 text-[13px] leading-6 text-white/80">مهارات موزعة حسب ما يحتاجه التحدي.</p>
                </div>
              </div>
              <div className="scroll-in from-left absolute bottom-[6%] left-0 w-[58%]" style={{ '--step': 3 } as React.CSSProperties}>
                <div className="float rotate-3 rounded-2xl bg-surface p-4 shadow-lift sm:p-5" style={{ '--step': 2 } as React.CSSProperties}>
                <p className="flex items-center justify-between gap-2 text-base font-semibold">
                  فريق متكامل
                  <span className="flex size-5 items-center justify-center rounded-full bg-lime text-[11px] text-good">✓</span>
                </p>
                <div className="mt-3 flex">
                  {['var(--color-peach)', 'var(--color-violet)', 'var(--color-sky)', 'var(--color-lime)'].map((tone, i) => (
                    <AvatarShape key={tone} tone={tone} className={`size-11 sm:size-12 ${i > 0 ? '-ms-3' : ''}`} />
                  ))}
                </div>
              </div>
              </div>
            </div>
          </div>
        </section>

        <section id="challenges" aria-labelledby="challenges-heading">
          <div className="scroll-in flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-violet-deep">
                <span className="size-2 rounded-full bg-violet-deep" aria-hidden />
                أحدث التحديات
              </p>
              <h2 id="challenges-heading" className="mt-2 text-3xl leading-tight font-bold sm:text-4xl">رحلة من التحديات الملهمة.</h2>
            </div>
            {sorted.length > RECENT_COUNT ? (
              <button type="button" aria-expanded={showAll} onClick={() => setShowAll(!showAll)} className="press inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-sm font-medium text-violet-deep underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-violet-deep">
                {showAll ? 'عرض الأحدث فقط' : 'عرض جميع التحديات السابقة'}
                <ArrowLeft className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>

          {challenges !== null && sorted.length === 0 ? (
            <div className="mt-6">
              <EmptyState title="لا توجد تحديات سابقة بعد">
                <p className="mb-4">أنشئ تحديك الأول، وسيظهر هنا.</p>
                <Button onClick={create}>
                  <Plus className="size-4" aria-hidden />
                  أنشئ تحديًا جديدًا
                </Button>
              </EmptyState>
            </div>
          ) : null}

          {shown.length > 0 ? (
            <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((challenge, i) => (
                <ChallengeCard key={challenge.id} challenge={challenge} index={i} onRemove={() => remove(challenge)} />
              ))}
            </ul>
          ) : null}
          <p className="mt-4 text-[13px] text-muted">تحدياتك تُحفظ في هذا المتصفح فقط.</p>
        </section>

        <section aria-labelledby="start-heading" className="scroll-in from-far relative overflow-hidden rounded-[32px] bg-lavender p-8 sm:p-12">
          <div className="relative z-10 max-w-md">
            <h2 id="start-heading" className="text-3xl leading-tight font-bold sm:text-4xl">جاهز تكوّن فريقك؟</h2>
            <p className="mt-3 text-muted">ابدأ تحديك القادم مع فِرقة.</p>
            <Button onClick={create} className="mt-6 min-h-13 px-8 text-base font-semibold">
              ابدأ الآن
              <ArrowLeft className="size-5" aria-hidden />
            </Button>
          </div>
          <div aria-hidden className="relative mx-auto mt-8 h-44 w-64 md:absolute md:top-1/2 md:left-12 md:mt-0 md:h-64 md:w-96 md:-translate-y-1/2">
            <svg viewBox="0 0 380 250" className="absolute inset-0 size-full" fill="none">
              <g className="spin-slow">
                <ellipse cx="190" cy="125" rx="184" ry="84" transform="rotate(-12 190 125)" stroke="var(--color-violet)" />
              </g>
            </svg>
            <div className="scroll-in from-small absolute top-[2%] left-[8%] w-[56%]" style={{ '--step': 2 } as React.CSSProperties}><div className="float"><PlusShape tone="violet" className="w-full" /></div></div>
            <div className="scroll-in from-small absolute right-[8%] bottom-0 w-[44%]" style={{ '--step': 4 } as React.CSSProperties}><div className="float" style={{ '--step': 2 } as React.CSSProperties}><PlusShape tone="lime" className="w-full" /></div></div>
            <Sparkle className="absolute top-[6%] right-[4%] size-5 text-violet-deep" />
            <Sparkle className="absolute bottom-[8%] left-0 size-4 text-violet-deep" step={2} />
          </div>
        </section>
      </div>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm">
          <Logo className="!text-lg" />
          <p className="text-muted">فِرقة © <span className="num">2026</span></p>
          <p className="flex items-center gap-2 text-muted">
            <FirqahMark className="size-4" />
            <span className="ltr-value">Different skills. One team.</span>
          </p>
        </div>
      </footer>
    </>
  );
}
