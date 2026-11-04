// Shared building blocks, so every screen looks and behaves the same.
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, Sparkles, XCircle } from 'lucide-react';
import { NodeGlyph } from './Brand.tsx';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-card border border-line/70 bg-surface p-4 shadow-card sm:p-6 ${className}`}>{children}</section>;
}

export function CardTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-3">
      <h2 className="text-lg font-semibold">{children}</h2>
      {hint ? <p className="mt-1 text-[13px] text-muted">{hint}</p> : null}
    </div>
  );
}

const BUTTON_STYLES = {
  primary: 'bg-lime text-midnight hover:bg-lime-strong hover:shadow-[0_8px_20px_-8px_rgb(200_241_107/0.9)]',
  secondary: 'border border-control bg-surface text-ink hover:border-violet-deep hover:text-violet-deep',
  ghost: 'text-muted hover:bg-raised hover:text-ink',
  selected: 'bg-violet text-midnight',
  onDark: 'border border-white/50 text-white hover:border-white hover:bg-white/10',
} as const;

export const buttonClass = (variant: keyof typeof BUTTON_STYLES = 'primary') =>
  `press inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-deep disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_STYLES[variant]}`;

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
  'min-h-11 w-full rounded-xl border border-control bg-surface px-3 py-2 text-sm text-ink transition-[border-color,box-shadow] duration-150 placeholder:text-muted hover:border-violet-deep/60 focus:border-violet-deep focus:ring-3 focus:ring-violet/30 focus:outline-none';

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

const NOTICE_STYLES: Record<Tone, { Icon: typeof Info; iconColor: string; ground: string }> = {
  error: { Icon: XCircle, iconColor: 'text-bad', ground: 'bg-peach/30' },
  warning: { Icon: AlertTriangle, iconColor: 'text-warn', ground: 'bg-peach/15' },
  info: { Icon: Info, iconColor: 'text-violet-deep', ground: 'bg-raised' },
  success: { Icon: CheckCircle2, iconColor: 'text-good', ground: 'bg-lime/25' },
};

export function Notice({ tone, title, children }: { tone: Tone; title?: string; children?: ReactNode }) {
  const { Icon, iconColor, ground } = NOTICE_STYLES[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`arrive flex gap-3 rounded-tile p-3 text-sm ${ground}`}>
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
    <div role="status" className="flex items-center gap-3 rounded-tile bg-raised p-3 text-sm text-muted">
      <span className="node-pulse flex items-center gap-1" aria-hidden>
        <span className="size-2 rounded-full bg-violet-deep" />
        <span className="size-2 rounded-full bg-violet" style={{ '--step': 1 } as React.CSSProperties} />
        <span className="size-2 rounded-full bg-lime-strong" style={{ '--step': 2 } as React.CSSProperties} />
      </span>
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
    <div className="rounded-card border border-dashed border-control bg-surface/60 p-8 text-center">
      <NodeGlyph className="mx-auto mb-3 size-9 text-violet-deep" />
      <p className="font-medium">{title}</p>
      {children ? <div className="mt-2 text-sm text-muted">{children}</div> : null}
    </div>
  );
}

/** Says where a value came from, so manual or computed data is never mistaken for AI output. */
export function SourceBadge({ kind }: { kind: 'llama' | 'manual' | 'computed' | 'synthetic' }) {
  const styles = {
    llama: ['من AI', 'bg-lavender text-violet-deep'],
    manual: ['يدوي', 'bg-canvas text-muted'],
    computed: ['محسوب بالكود', 'bg-sky/20 text-ink'],
    synthetic: ['بيانات اصطناعية', 'bg-peach/25 text-warn'],
  }[kind];
  return (
    <span className={`inline-flex flex-none items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${styles[1]}`}>
      {kind === 'llama' ? <Sparkles className="size-3" aria-hidden /> : null}
      {styles[0]}
    </span>
  );
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
