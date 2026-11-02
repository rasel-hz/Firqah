import type { Participant } from '../optimizer/types.ts';

/**
 * SYNTHETIC sample data: fictional people, invented for testing and demos only.
 * Levels use the 0-5 scale. Column order: AI/ML, Frontend, Backend, UI/UX, Presentation.
 */
export const SAMPLE_SKILLS = ['AI/ML', 'Frontend', 'Backend', 'UI/UX', 'Presentation'] as const;

const ROWS: [string, string, number[]][] = [
  ['P01', 'نورة الحربي', [5, 2, 1, 0, 3]],
  ['P02', 'فهد العتيبي', [1, 5, 3, 2, 1]],
  ['P03', 'ريم القحطاني', [2, 1, 0, 5, 4]],
  ['P04', 'سلطان الدوسري', [4, 3, 4, 1, 2]],
  ['P05', 'لمى الشهري', [0, 4, 2, 4, 3]],
  ['P06', 'خالد الغامدي', [3, 2, 5, 0, 1]],
  ['P07', 'هند الزهراني', [1, 1, 1, 3, 5]],
  ['P08', 'عبدالله المطيري', [4, 4, 2, 1, 2]],
  ['P09', 'سارة السبيعي', [2, 3, 1, 4, 4]],
  ['P10', 'تركي الشمري', [5, 1, 3, 0, 1]],
  ['P11', 'دانة العمري', [0, 5, 1, 3, 2]],
  ['P12', 'ماجد البلوي', [3, 2, 4, 1, 3]],
  ['P13', 'جود الحارثي', [1, 2, 0, 5, 5]],
  ['P14', 'بندر العنزي', [2, 4, 3, 0, 1]],
  ['P15', 'غادة الرشيدي', [4, 0, 2, 2, 4]],
  ['P16', 'يزيد السلمي', [0, 3, 5, 1, 0]],
  ['P17', 'أروى القرني', [3, 5, 0, 3, 2]],
  ['P18', 'مشعل الجهني', [2, 1, 2, 4, 3]],
  ['P19', 'لجين العسيري', [5, 2, 1, 2, 4]],
  ['P20', 'ناصر الخالدي', [1, 3, 4, 0, 1]],
  ['P21', 'مها الأحمدي', [3, 1, 0, 5, 3]],
  ['P22', 'وليد الثقفي', [2, 4, 3, 1, 0]],
  ['P23', 'رهف البقمي', [4, 3, 1, 3, 5]],
  ['P24', 'سعود الصاعدي', [0, 2, 2, 2, 2]],
];

/** Scenario A: a reasonably varied, balanced pool of 24. */
export function balancedParticipants(): Participant[] {
  return ROWS.map(([id, name, levels]) => ({
    id,
    name,
    skills: Object.fromEntries(SAMPLE_SKILLS.map((skill, i) => [skill, levels[i]])),
  }));
}

/** Scenario B: many beginners, only two participants keep high AI/ML and UI/UX levels. */
export function imbalancedParticipants(): Participant[] {
  const keepAi = new Set(['P01', 'P10']);
  const keepUx = new Set(['P03', 'P21']);
  return balancedParticipants().map((p) => ({
    ...p,
    skills: {
      ...p.skills,
      'AI/ML': keepAi.has(p.id) ? p.skills['AI/ML'] : Math.min(p.skills['AI/ML'] as number, 2),
      'UI/UX': keepUx.has(p.id) ? p.skills['UI/UX'] : Math.min(p.skills['UI/UX'] as number, 2),
    },
  }));
}

/** Scenario C: only three participants have an advanced (4+) AI/ML level. */
export function scarceAiParticipants(): Participant[] {
  const experts = new Set(['P01', 'P10', 'P19']);
  return balancedParticipants().map((p) => ({
    ...p,
    skills: {
      ...p.skills,
      'AI/ML': experts.has(p.id) ? 5 : Math.min(p.skills['AI/ML'] as number, 3),
    },
  }));
}
