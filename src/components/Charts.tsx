// Small charts built from plain elements. Each mark has a tooltip, and every value is also written as text.
import type { RunParticipant } from '@/lib/state/types.ts';
import type { TeamMetrics } from '@/lib/optimizer/types.ts';

export function BarRow({ label, value, max, display, tone = 'info', title }: { label: string; value: number; max: number; display: string; tone?: 'info' | 'accent' | 'muted'; title?: string }) {
  const fill = { info: 'bg-info', accent: 'bg-accent-soft', muted: 'bg-muted/60' }[tone];
  const width = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="grid grid-cols-[minmax(0,9.5rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,11rem)_1fr_auto]" title={title ?? `${label}: ${display}`}>
      <span className="truncate text-muted">{label}</span>
      <div className="h-2.5 rounded-e-sm bg-raised">
        <div className={`h-full rounded-e-[4px] ${fill}`} style={{ width: `${width}%` }} />
      </div>
      <span className="ltr-value font-medium tabular-nums">{display}</span>
    </div>
  );
}

const SCALE_MAX = 5;

/** One hue, more is stronger. Text flips on the strongest cells so it stays readable. */
function cellStyle(value: number) {
  const share = Math.round((Math.min(value, SCALE_MAX) / SCALE_MAX) * 85);
  return {
    backgroundColor: `color-mix(in oklab, var(--color-info) ${share}%, var(--color-surface))`,
    color: share > 50 ? '#07121f' : 'var(--color-ink)',
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
              <th scope="col" className="p-1.5 text-start font-medium text-muted">الفريق</th>
              {skills.map((skill) => (
                <th key={skill} scope="col" className="p-1.5 text-center text-xs font-medium whitespace-nowrap text-muted ltr-value">{skill}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((team) => (
              <tr key={team.teamId}>
                <th scope="row" className="p-1.5 text-start font-medium ltr-value">{team.teamId}</th>
                {skills.map((skill) => {
                  const value = team.skillStrength[skill] ?? 0;
                  return (
                    <td
                      key={skill}
                      title={`${team.teamId} / ${skill}: متوسط ${value}، مؤهلون ${team.qualifying[skill] ?? 0}`}
                      style={cellStyle(value)}
                      className="min-w-14 rounded p-1.5 text-center tabular-nums"
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
      <p className="text-xs text-muted">متوسط مستوى الأعضاء من 0 إلى 5 (اللون الأقوى أعلى). المجهول يُحسب 0 في هذا المتوسط فقط.</p>
    </div>
  );
}

export function memberName(participants: RunParticipant[], id: string): string {
  return participants.find((p) => p.id === id)?.name ?? id;
}
