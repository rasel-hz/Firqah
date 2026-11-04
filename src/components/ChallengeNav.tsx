import Link from 'next/link';
import { NodeGlyph } from './Brand.tsx';
import { EmptyState, Loading, buttonClass } from './ui.tsx';

const STEPS = [
  { key: 'setup', label: 'التحدي', path: '' },
  { key: 'participants', label: 'المشاركون', path: '/participants' },
  { key: 'results', label: 'النتائج', path: '/results' },
] as const;

export function ChallengeNav({ id, name, current }: { id: string; name: string; current: (typeof STEPS)[number]['key'] }) {
  return (
    <div className="on-dark relative mb-6 overflow-hidden rounded-card bg-midnight p-5 text-white sm:p-7">
      <span className="pointer-events-none absolute -top-20 -left-10 size-60 rounded-full bg-violet/35 blur-3xl" aria-hidden />
      <NodeGlyph className="pointer-events-none absolute top-1/2 left-6 hidden size-28 -translate-y-1/2 text-white/60 md:block" />
      <h1 className="relative text-2xl leading-snug font-bold break-words sm:text-[28px] md:me-36">{name.trim() || 'تحدٍ جديد'}</h1>
      <nav aria-label="خطوات التحدي" className="relative mt-5">
        <ol className="flex items-center gap-1 sm:gap-2">
          {STEPS.map((step, i) => {
            const isCurrent = step.key === current;
            return (
              <li key={step.key} className="flex min-w-0 items-center gap-1 sm:gap-2">
                {i > 0 ? <span className="h-px w-2 shrink-0 bg-white/30 sm:w-6" aria-hidden /> : null}
                <Link
                  href={`/challenge/${id}${step.path}`}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={`press inline-flex min-h-10 items-center gap-1.5 rounded-full px-2 py-1 pe-3 text-sm whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 sm:gap-2 ${
                    isCurrent ? 'bg-violet font-semibold text-midnight' : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className={`num flex size-6 items-center justify-center rounded-full text-xs font-semibold ${isCurrent ? 'bg-midnight text-white' : 'bg-white/15'}`} aria-hidden>{i + 1}</span>
                  {step.label}
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

/** The two states every challenge screen shares: still reading storage, and not found. */
export function ChallengeGate({ state }: { state: undefined | null }) {
  if (state === undefined) return <Loading label="جارٍ التحميل..." />;
  return (
    <EmptyState title="هذا التحدي غير موجود في هذا المتصفح">
      <p className="mb-3">تُحفظ البيانات في المتصفح الذي أُنشئت فيه فقط.</p>
      <Link href="/" className={buttonClass('secondary')}>
        العودة إلى الرئيسية
      </Link>
    </EmptyState>
  );
}
