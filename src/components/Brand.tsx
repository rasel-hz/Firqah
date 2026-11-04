// FIRQAH's identity marks. Different skills, one team: separate shapes that connect.
import { useId } from 'react';

const STAR = 'M24 5C26 16 32 22 43 24 32 26 26 32 24 43 22 32 16 26 5 24 16 22 22 16 24 5Z';

export function FirqahMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path d={STAR} fill="var(--color-violet)" stroke="var(--color-violet)" strokeWidth="5" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 text-2xl font-bold ${className}`}>
      <FirqahMark />
      فِرقة
    </span>
  );
}

/** A small four-point star, used as a spark of light around the larger shapes. */
export function Sparkle({ className = '', step = 0 }: { className?: string; step?: number }) {
  return (
    <svg viewBox="0 0 48 48" className={`twinkle ${className}`} style={{ '--step': step } as React.CSSProperties} aria-hidden>
      <path d={STAR} fill="currentColor" />
    </svg>
  );
}

/** The constellation at icon size: three skills joined. It marks AI-related parts of the internal pages. */
export function NodeGlyph({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M6 7 18 5M6 7l7 12M18 5l-5 14" stroke="currentColor" strokeWidth="1.3" opacity="0.55" fill="none" />
      <circle cx="6" cy="7" r="3" fill="var(--color-violet)" />
      <circle cx="18" cy="5" r="2.4" fill="var(--color-peach)" />
      <circle cx="13" cy="19" r="2.8" fill="var(--color-lime)" />
    </svg>
  );
}

const PLUS = 'M66 38Q66 8 100 8 134 8 134 38V48Q134 66 152 66H162Q192 66 192 100 192 134 162 134H152Q134 134 134 152V162Q134 192 100 192 66 192 66 162V152Q66 134 48 134H38Q8 134 8 100 8 66 38 66H48Q66 66 66 48Z';

/** A soft, raised plus: one piece of a team. */
export function PlusShape({ tone, className = '' }: { tone: 'violet' | 'lime' | 'peach' | 'sky'; className?: string }) {
  const id = useId();
  const stops = {
    violet: ['#b9abff', '#7b65f2', '#4b39ad'],
    lime: ['#e6faaf', '#c8f16b', '#93b943'],
    peach: ['#ffd3c0', '#ffad8b', '#d97f5b'],
    sky: ['#bce8f1', '#79c9dc', '#4d9bae'],
  }[tone];
  return (
    <svg viewBox="0 0 210 210" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={stops[0]} />
          <stop offset="1" stopColor={stops[1]} />
        </linearGradient>
      </defs>
      <path d={PLUS} transform="translate(5 9)" fill={stops[2]} />
      <path d={PLUS} fill={`url(#${id})`} />
    </svg>
  );
}

/** An abstract person. It stands for anyone, so it never looks like a real participant. */
export function AvatarShape({ tone, className = 'size-12' }: { tone: string; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <circle cx="24" cy="24" r="23" fill={tone} stroke="#fff" strokeWidth="2" />
      <circle cx="24" cy="19" r="7" fill="var(--color-midnight)" />
      <path d="M10 41c1-10 7-14 14-14s13 4 14 14a23 23 0 0 1-28 0Z" fill="var(--color-midnight)" />
    </svg>
  );
}
