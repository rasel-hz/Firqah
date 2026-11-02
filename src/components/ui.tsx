// Shared building blocks, so every screen looks and behaves the same.
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from 'lucide-react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-surface p-4 sm:p-5 ${className}`}>{children}</section>;
}

export function CardTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-3">
      <h2 className="text-lg font-bold">{children}</h2>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

const BUTTON_STYLES = {
  primary: 'bg-accent text-white hover:brightness-110',
  secondary: 'border border-line bg-raised text-ink hover:border-accent-soft',
  ghost: 'text-muted hover:bg-raised hover:text-ink',
} as const;

export const buttonClass = (variant: keyof typeof BUTTON_STYLES = 'primary') =>
  `inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_STYLES[variant]}`;

export function Button({
  variant = 'primary',
  loading = false,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BUTTON_STYLES; loading?: boolean }) {
  return (
    <button type="button" {...props} disabled={props.disabled || loading} className={`${buttonClass(variant)} ${props.className ?? ''}`}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

export const inputClass =
  'w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-info focus:outline-none';

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

type Tone = 'error' | 'warning' | 'info' | 'success';

const NOTICE_STYLES: Record<Tone, { box: string; Icon: typeof Info; iconColor: string }> = {
  error: { box: 'border-bad/40 bg-bad/10', Icon: XCircle, iconColor: 'text-bad' },
  warning: { box: 'border-warn/40 bg-warn/10', Icon: AlertTriangle, iconColor: 'text-warn' },
  info: { box: 'border-info/40 bg-info/10', Icon: Info, iconColor: 'text-info' },
  success: { box: 'border-good/40 bg-good/10', Icon: CheckCircle2, iconColor: 'text-good' },
};

export function Notice({ tone, title, children }: { tone: Tone; title?: string; children?: ReactNode }) {
  const { box, Icon, iconColor } = NOTICE_STYLES[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex gap-3 rounded-lg border p-3 text-sm ${box}`}>
      <Icon className={`mt-0.5 size-4 shrink-0 ${iconColor}`} aria-hidden />
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className="text-ink/90">{children}</div> : null}
      </div>
    </div>
  );
}

/** No percentages: the app cannot know how far along the model is. */
export function Loading({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center gap-3 rounded-lg border border-line bg-raised p-3 text-sm text-muted">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line p-8 text-center">
      <p className="font-medium">{title}</p>
      {children ? <div className="mt-2 text-sm text-muted">{children}</div> : null}
    </div>
  );
}

/** Says where a value came from, so manual or computed data is never mistaken for AI output. */
export function SourceBadge({ kind }: { kind: 'llama' | 'manual' | 'computed' | 'synthetic' }) {
  const styles = {
    llama: ['من Llama', 'border-accent-soft/50 text-accent-soft'],
    manual: ['يدوي', 'border-line text-muted'],
    computed: ['محسوب بالكود', 'border-info/50 text-info'],
    synthetic: ['بيانات اصطناعية', 'border-warn/50 text-warn'],
  }[kind];
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-xs whitespace-nowrap ${styles[1]}`}>{styles[0]}</span>;
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
