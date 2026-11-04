// The Skill Constellation: FIRQAH's signature visual. It shows the idea with general skills, not a real analysis result.
'use client';

import { useState } from 'react';
import { BarChart3, ListChecks, PenTool, Search, Trophy, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Sparkle } from './Brand.tsx';

const WIDTH = 500;
const HEIGHT = 450;
const CENTER = { x: 50, y: 50 };

interface SkillNode {
  key: string;
  label: string;
  tip: string;
  Icon: LucideIcon;
  tone: string;
  /** Position inside the constellation, in percent. */
  x: number;
  y: number;
  tilt: number;
  /** Which edge the tooltip lines up with, so it never leaves the constellation. */
  tipEdge: 'left' | 'right';
  bend: number;
}

const NODES: SkillNode[] = [
  { key: 'research', label: 'البحث', tip: 'جمع المعلومات وفهم الوضع الحالي قبل اقتراح أي حل.', Icon: Search, tone: 'tile-violet', x: 45, y: 13, tilt: -4, tipEdge: 'right', bend: 40 },
  { key: 'design', label: 'التصميم', tip: 'تحويل الفكرة إلى تجربة واضحة وسهلة على من يستخدمها.', Icon: PenTool, tone: 'tile-peach', x: 84, y: 22, tilt: 7, tipEdge: 'right', bend: -46 },
  { key: 'data', label: 'تحليل البيانات', tip: 'قراءة الأرقام واستخراج ما يدعم القرار.', Icon: BarChart3, tone: 'tile-sky', x: 86, y: 63, tilt: -5, tipEdge: 'right', bend: 44 },
  { key: 'projects', label: 'إدارة المشاريع', tip: 'تنظيم المهام والوقت حتى يصل الفريق إلى التسليم.', Icon: ListChecks, tone: 'tile-lime', x: 36, y: 85, tilt: 6, tipEdge: 'left', bend: -38 },
  { key: 'users', label: 'فهم المستخدم', tip: 'الاستماع إلى الناس ومعرفة ما يحتاجونه فعلًا.', Icon: Users, tone: 'tile-violet', x: 14, y: 35, tilt: 8, tipEdge: 'left', bend: 42 },
];

/** A curved link from the challenge to a skill, bent sideways so the lines read as an orbit. */
function linkPath(node: SkillNode): string {
  const from = { x: (CENTER.x / 100) * WIDTH, y: (CENTER.y / 100) * HEIGHT };
  const to = { x: (node.x / 100) * WIDTH, y: (node.y / 100) * HEIGHT };
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const cx = (from.x + to.x) / 2 + (-dy / length) * node.bend;
  const cy = (from.y + to.y) / 2 + (dx / length) * node.bend;
  return `M${from.x} ${from.y}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${to.x} ${to.y}`;
}

export function SkillConstellation() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <figure className="constellation relative mx-auto w-full max-w-[560px]" aria-label="المهارات التي يحتاجها تحديك">
      <div className="constellation-glow absolute -inset-[8%] rounded-full" aria-hidden />

      <div className="relative" style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }} onKeyDown={(e) => { if (e.key === 'Escape') setActive(null); }}>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="absolute inset-0 size-full overflow-visible" aria-hidden>
          <g className="spin-slow">
            <ellipse cx="250" cy="225" rx="226" ry="168" transform="rotate(-14 250 225)" fill="none" stroke="rgb(155 135 255 / 0.28)" />
          </g>
          {NODES.map((node, i) => {
            const d = linkPath(node);
            return (
              <g key={node.key}>
                <path d={d} className="link-line" data-active={active === node.key} />
                <circle r="3.4" fill="var(--color-lime)" className="particle" style={{ offsetPath: `path('${d}')`, '--step': i } as React.CSSProperties} />
              </g>
            );
          })}
        </svg>

        <Sparkle className="absolute top-[3%] left-[66%] size-4 text-lime" />
        <Sparkle className="absolute top-[88%] left-[72%] size-5 text-lime" step={1} />
        <Sparkle className="absolute top-[70%] left-[6%] size-3 text-violet" step={2} />

        <div className="absolute z-10" style={{ left: `${CENTER.x}%`, top: `${CENTER.y}%`, transform: 'translate(-50%, -50%)' }}>
          <div className="pop-in">
            <div className="relative">
              <span className="pulse-ring absolute inset-0 rounded-[24%] border-2 border-lime" aria-hidden />
              <div className="tile tile-center tile-lime relative">
                <Trophy className="size-[26%] min-h-6" aria-hidden />
                تحديك القادم
              </div>
            </div>
          </div>
        </div>

        {NODES.map((node, i) => {
          const isActive = active === node.key;
          const tipId = `skill-tip-${node.key}`;
          return (
            <div key={node.key} className={`absolute ${isActive ? 'z-30' : 'z-20'}`} style={{ left: `${node.x}%`, top: `${node.y}%`, transform: 'translate(-50%, -50%)' }}>
              <div className="pop-in" style={{ '--step': i + 1 } as React.CSSProperties}>
                <div className="float" style={{ '--step': i } as React.CSSProperties}>
                  <button
                    type="button"
                    aria-describedby={tipId}
                    data-active={isActive}
                    onMouseEnter={() => setActive(node.key)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(node.key)}
                    onBlur={() => setActive(null)}
                    onClick={() => setActive(node.key)}
                    className={`tile ${node.tone} cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`}
                    style={{ transform: `rotate(${node.tilt}deg)` }}
                  >
                    <node.Icon className="size-[32%] min-h-5" aria-hidden />
                    {node.label}
                  </button>
                </div>
              </div>
              <p
                id={tipId}
                role="tooltip"
                className={`absolute top-full z-30 mt-2 w-44 rounded-xl bg-white p-2.5 text-xs leading-5 text-ink shadow-lift transition-opacity duration-200 sm:w-52 ${
                  node.tipEdge === 'left' ? 'left-0' : 'right-0'
                } ${isActive ? 'visible opacity-100' : 'invisible opacity-0'}`}
              >
                {node.tip}
              </p>
            </div>
          );
        })}
      </div>

    </figure>
  );
}
