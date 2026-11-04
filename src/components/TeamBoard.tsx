// The team board: everyone as a seat at their team's table. Its signature move shows people gathering
// into teams, and on a regenerate each person travels from their old seat to their new one.
'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { initialOf } from '@/lib/results/board.ts';
import type { BoardTeam } from '@/lib/results/board.ts';
import type { SkillStatus } from '@/lib/llama/review.ts';
import { Button, Card } from './ui.tsx';

const STATUS_LABEL: Record<SkillStatus, string> = { met: 'مغطاة', unconfirmed: 'غير مؤكدة', missing: 'نقص' };
const SEAT_TONES = ['bg-violet/70', 'bg-peach/80', 'bg-sky/70', 'bg-lime/80'];

function StatusMark({ status }: { status: SkillStatus }) {
  // A piece in place, an outlined place, a missing piece: the shape carries the meaning, not only the colour.
  if (status === 'met') return <span className="block size-2.5 rotate-45 rounded-[2px] border border-good bg-lime" />;
  if (status === 'unconfirmed') return <span className="block size-2.5 rotate-45 rounded-[2px] border border-muted" />;
  return <span className="block size-2.5 rotate-45 rounded-[2px] bg-bad" />;
}

export function TeamBoard({
  runId,
  teams,
  skills,
  selected,
  onSelect,
}: {
  runId: string;
  teams: BoardTeam[];
  skills: string[];
  selected: string;
  onSelect: (teamId: string) => void;
}) {
  const [lens, setLens] = useState<string | null>(null);
  const [replay, setReplay] = useState(0);
  const board = useRef<HTMLDivElement>(null);
  const seats = useRef(new Map<string, { x: number; y: number }>());
  const played = useRef<string | null>(null);

  // Transform and opacity only. It runs when the teams change, never when a lens or a team is picked.
  useLayoutEffect(() => {
    const root = board.current;
    const key = `${runId}:${replay}`;
    if (!root || played.current === key) return;
    played.current = key;

    const tokens = [...root.querySelectorAll<HTMLElement>('[data-member]')];
    // A move still in flight would make the measurements wrong.
    for (const el of tokens) el.getAnimations().forEach((animation) => animation.cancel());

    // Measured inside the board, so scrolling or the board's own entrance cannot shift the seats.
    const box = root.getBoundingClientRect();
    const next = new Map<string, { x: number; y: number }>();
    for (const el of tokens) {
      const r = el.getBoundingClientRect();
      next.set(el.dataset.member as string, { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top });
    }

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const gather = { x: box.width / 2, y: box.height / 2 };
      tokens.forEach((el, i) => {
        const to = next.get(el.dataset.member as string);
        if (!to) return;
        const from = seats.current.get(el.dataset.member as string);
        const start = from ?? gather;
        const dx = start.x - to.x;
        const dy = start.y - to.y;
        if (from && dx === 0 && dy === 0) return;
        el.animate(
          [
            { transform: `translate(${dx}px, ${dy}px) scale(${from ? 1 : 0.5})`, opacity: from ? 1 : 0 },
            { transform: 'none', opacity: 1 },
          ],
          { duration: 800, delay: Math.min(i * 22, 420), easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' },
        );
      });
    }
    seats.current = next;
  }, [runId, replay]);

  function replayFormation() {
    seats.current = new Map();
    setReplay((n) => n + 1);
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">لوحة الفرق</h2>
          <p className="mt-1 text-[13px] text-muted">اختر مهارة لترى المؤهلين فيها، أو فريقًا لقراءة تفاصيله.</p>
        </div>
        <Button variant="ghost" onClick={replayFormation}>
          <Play className="size-3.5" aria-hidden />
          إعادة عرض التكوين
        </Button>
      </div>

      <div role="group" aria-label="إبراز مهارة" className="flex flex-wrap gap-2">
        {[null, ...skills].map((skill) => {
          const active = lens === skill;
          return (
            <button
              key={skill ?? 'all'}
              type="button"
              aria-pressed={active}
              onClick={() => setLens(skill)}
              className={`press min-h-8 rounded-full px-3 py-1 text-[13px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-deep ${
                active ? 'bg-violet font-medium text-midnight' : 'bg-raised text-muted hover:text-ink'
              }`}
            >
              <span className={skill ? 'ltr-value' : ''}>{skill ?? 'كل الأعضاء'}</span>
            </button>
          );
        })}
      </div>

      <div ref={board} className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => {
          const isSelected = team.id === selected;
          const lensCount = lens ? team.members.filter((m) => m.qualified.includes(lens)).length : null;
          return (
            <button
              key={team.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(team.id)}
              className={`press lift block w-full rounded-2xl border p-4 text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-deep ${
                isSelected ? 'border-violet bg-raised ring-1 ring-violet' : 'border-line bg-canvas hover:bg-raised/60'
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="ltr-value font-semibold">{team.id}</span>
                {lensCount !== null ? <span className="num swap text-xs text-muted" key={lens}>{lensCount} مؤهل</span> : null}
              </span>

              <span className="mt-3 grid grid-cols-4 gap-1 sm:grid-cols-5">
                {team.members.map((member, seat) => {
                  const lit = lens ? member.qualified.includes(lens) : false;
                  const dim = lens !== null && !lit;
                  return (
                    <span key={member.id} className="flex min-w-0 flex-col items-center gap-1" title={`${member.name}${member.qualified.length ? `: ${member.qualified.join('، ')}` : ''}`}>
                      <span
                        data-member={member.id}
                        className={`relative flex size-10 items-center justify-center rounded-full text-sm font-medium transition-[background-color,color,opacity] duration-200 motion-reduce:transition-none ${
                          SEAT_TONES[seat % SEAT_TONES.length]
                        } text-ink ${lit ? 'ring-2 ring-violet-deep ring-offset-2 ring-offset-surface' : ''} ${dim ? 'opacity-40' : ''}`}
                      >
                        {initialOf(member.name)}
                      </span>
                      <span className={`w-full truncate text-center text-xs transition-opacity duration-200 motion-reduce:transition-none ${dim ? 'text-muted opacity-60' : 'text-muted'}`}>
                        {member.name.split(' ')[0]}
                      </span>
                    </span>
                  );
                })}
              </span>

              <span className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
                {team.status.map(({ skill, status }) => (
                  <span key={skill} className="flex items-center gap-1.5 text-xs text-muted" title={`${skill}: ${STATUS_LABEL[status]}`}>
                    <StatusMark status={status} />
                    <span className="ltr-value">{skill}</span>
                    <span className="sr-only">{STATUS_LABEL[status]}</span>
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {(['met', 'unconfirmed', 'missing'] as const).map((status) => (
          <span key={status} className="flex items-center gap-1.5">
            <StatusMark status={status} />
            {STATUS_LABEL[status]}
          </span>
        ))}
      </div>
    </Card>
  );
}
