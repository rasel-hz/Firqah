// Small charts built from plain elements. Each mark has a tooltip, and every value is also written as text.
'use client';

import { useLayoutEffect, useState } from 'react';
import type { TeamMetrics } from '@/lib/optimizer/types.ts';

export function BarRow({
  label,
  value,
  max,
  display,
  tone = 'data',
  title,
  step = 0,
}: {
  label: string;
  value: number;
  max: number;
  display: string;
  tone?: 'data' | 'muted';
  title?: string;
  step?: number;
}) {
  const fill = tone === 'data' ? 'bg-data' : 'bg-control';
  const width = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="grid grid-cols-[minmax(0,9.5rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,11rem)_1fr_auto]" title={title ?? `${label}: ${display}`}>
      <span className="truncate text-muted">{label}</span>
      <div className="h-2 overflow-hidden rounded-full bg-raised">
        {width > 0 ? <div className={`grow h-full rounded-full ${fill}`} style={{ width: `${width}%`, '--step': step } as React.CSSProperties} /> : null}
      </div>
      <span className="ltr-value num font-medium">{display}</span>
    </div>
  );
}

/** Counts up once when it first appears. Under reduced motion it simply shows the value. */
export function RollingNumber({ value, className = '' }: { value: number; className?: string }) {
  const [shown, setShown] = useState(value);

  useLayoutEffect(() => {
    // A hidden tab pauses animation frames, so the real value stays on screen instead of a stalled count.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.visibilityState !== 'visible') {
      setShown(value);
      return;
    }
    setShown(0);
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / 900);
      const eased = 1 - (1 - t) ** 4;
      setShown(t === 1 ? value : value * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span className={`ltr-value num ${className}`} aria-label={String(value)}>
      {shown.toFixed(2)}
    </span>
  );
}

const SCALE_MAX = 5;

/** One hue, more is stronger. Midnight text stays readable on every step of it. */
function cellStyle(value: number) {
  const share = Math.round((Math.min(value, SCALE_MAX) / SCALE_MAX) * 85);
  return {
    backgroundColor: `color-mix(in oklab, var(--color-data) ${share}%, var(--color-surface))`,
  };
}

/** A table first, so screen readers and narrow screens get the same numbers as the color. */
export function SkillHeatmap({ skills, metrics }: { skills: string[]; metrics: TeamMetrics[] }) {
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0.5 text-sm">
          <thead>
            <tr>
              <th scope="col" className="p-1.5 text-start text-xs font-normal text-muted">الفريق</th>
              {skills.map((skill) => (
                <th key={skill} scope="col" className="ltr-value p-1.5 text-center text-xs font-normal whitespace-nowrap text-muted">{skill}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((team) => (
              <tr key={team.teamId}>
                <th scope="row" className="ltr-value p-1.5 text-start font-medium">{team.teamId}</th>
                {skills.map((skill) => {
                  const value = team.skillStrength[skill] ?? 0;
                  return (
                    <td
                      key={skill}
                      title={`${team.teamId} / ${skill}: متوسط ${value}، مؤهلون ${team.qualifying[skill] ?? 0}`}
                      style={cellStyle(value)}
                      className="num min-w-14 rounded p-1.5 text-center"
                    >
                      {value.toFixed(1)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">متوسط مستوى الأعضاء من 0 إلى 5، واللون الأقوى أعلى. المجهول يُحسب 0 في هذا المتوسط فقط.</p>
    </div>
  );
}
