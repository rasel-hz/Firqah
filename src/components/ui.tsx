// Shared building blocks, so every screen looks and behaves the same.
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from 'lucide-react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[20px] bg-surface p-4 sm:p-[22px] ${className}`}>{children}</section>;
}

export function CardTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-semibold">{children}</h2>
      {hint ? <p className="mt-1 text-[13px] text-muted">{hint}</p> : null}
    </div>
  );
}

const BUTTON_STYLES = {
  primary: 'bg-ink text-canvas hover:bg-muted',
  secondary: 'border border-control text-ink hover:border-ink',
  ghost: 'text-muted hover:text-ink',
} as const;

export const buttonClass = (variant: keyof typeof BUTTON_STYLES = 'primary') =>
  `press inline-flex min-h-9 items-center justify-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_STYLES[variant]}`;

export function Button({
  variant = 'primary',
  loading = false,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BUTTON_STYLES; loading?: boolean }) {
  return (
    <button type="button" {...props} disabled={props.disabled || loading} className={`${buttonClass(variant)} ${props.className ?? ''}`}>
      {loading ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> : null}
      {children}
    </button>
  );
}

export const inputClass =
  'w-full rounded-lg border border-control bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none';

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

type Tone = 'error' | 'warning' | 'info' | 'success';

const NOTICE_STYLES: Record<Tone, { Icon: typeof Info; iconColor: string }> = {
  error: { Icon: XCircle, iconColor: 'text-bad' },
  warning: { Icon: AlertTriangle, iconColor: 'text-warn' },
  info: { Icon: Info, iconColor: 'text-muted' },
  success: { Icon: CheckCircle2, iconColor: 'text-good' },
};

export function Notice({ tone, title, children }: { tone: Tone; title?: string; children?: ReactNode }) {
  const { Icon, iconColor } = NOTICE_STYLES[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className="arrive flex gap-3 rounded-xl bg-raised p-3 text-sm">
      <Icon className={`mt-0.5 size-4 shrink-0 ${iconColor}`} aria-hidden />
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className="text-muted">{children}</div> : null}
      </div>
    </div>
  );
}

/** No percentages: the app cannot know how far along the model is. */
export function Loading({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center gap-3 rounded-xl bg-raised p-3 text-sm text-muted">
      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
      {label}
    </div>
  );
}

/** One dot per person, lit when their result has really arrived. */
export function PersonDots({ done, total }: { done: number; total: number }) {
  return (
    <div className="flex flex-wrap gap-1.5" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`size-2.5 rounded-full transition-colors duration-300 motion-reduce:transition-none ${i < done ? 'bg-data' : 'bg-control'}`} />
      ))}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-[20px] border border-dashed border-control p-8 text-center">
      <p className="font-medium">{title}</p>
      {children ? <div className="mt-2 text-sm text-muted">{children}</div> : null}
    </div>
  );
}

/** Says where a value came from, so manual or computed data is never mistaken for AI output. */
export function SourceBadge({ kind }: { kind: 'llama' | 'manual' | 'computed' | 'synthetic' }) {
  const styles = {
    llama: ['من Llama', 'bg-raised text-ink'],
    manual: ['يدوي', 'bg-raised text-muted'],
    computed: ['محسوب بالكود', 'bg-raised text-muted'],
    synthetic: ['بيانات اصطناعية', 'bg-raised text-warn'],
  }[kind];
  return <span className={`inline-block flex-none rounded-full px-2 py-0.5 text-xs whitespace-nowrap ${styles[1]}`}>{styles[0]}</span>;
}

export const LEVEL_LABELS = ['لا يوجد', 'مبتدئ', 'أساسي', 'متوسط', 'متقدم', 'خبير'];

export function levelLabel(level: number | null): string {
  return level === null ? 'مجهول' : (LEVEL_LABELS[level] ?? String(level));
}

export function LevelSelect({
  value,
  onChange,
  allowUnknown = true,
  label,
}: {
  value: number | null;
  onChange: (level: number | null) => void;
  allowUnknown?: boolean;
  label: string;
}) {
  return (
    <select
      aria-label={label}
      className={inputClass}
      value={value === null ? 'unknown' : String(value)}
      onChange={(e) => onChange(e.target.value === 'unknown' ? null : Number(e.target.value))}
    >
      {allowUnknown ? <option value="unknown">مجهول</option> : null}
      {LEVEL_LABELS.map((text, level) => (
        <option key={level} value={level}>
          {level} - {text}
        </option>
      ))}
    </select>
  );
}
