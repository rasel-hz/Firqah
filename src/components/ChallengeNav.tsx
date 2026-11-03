import Link from 'next/link';
import { EmptyState, Loading, buttonClass } from './ui.tsx';

const STEPS = [
  { key: 'setup', label: 'التحدي', path: '' },
  { key: 'participants', label: 'المشاركون', path: '/participants' },
  { key: 'results', label: 'النتائج', path: '/results' },
] as const;

export function ChallengeNav({ id, name, current }: { id: string; name: string; current: (typeof STEPS)[number]['key'] }) {
  return (
    <div className="mb-6 space-y-3">
      <h1 className="text-2xl font-semibold break-words">{name.trim() || 'تحدٍ جديد'}</h1>
      <nav aria-label="خطوات التحدي" className="flex gap-1 overflow-x-auto border-b border-line">
        {STEPS.map((step) => (
          <Link
            key={step.key}
            href={`/challenge/${id}${step.path}`}
            aria-current={step.key === current ? 'page' : undefined}
            className={`press border-b-2 px-3 py-2 text-sm whitespace-nowrap ${
              step.key === current ? 'border-ink font-medium text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {step.label}
          </Link>
        ))}
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
