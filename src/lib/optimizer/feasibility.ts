import { computeCapacities } from './capacity.ts';
import type { Participant, SkillRequirement } from './types.ts';

export interface FeasibilityReport {
  feasible: boolean;
  reasons: string[];
}

/**
 * Cheap necessary conditions only. Passing this does NOT prove a valid arrangement
 * exists (several hard rules can interact); the search still has to find one.
 * Failing it proves the request cannot be satisfied, so we say so instead of guessing.
 */
export function checkFeasibility(
  participants: Participant[],
  requirements: SkillRequirement[],
  teamCount: number,
): FeasibilityReport {
  const reasons: string[] = [];

  if (participants.length === 0) {
    return { feasible: false, reasons: ['لا يوجد مشاركون لتوزيعهم.'] };
  }

  const ids = new Set<string>();
  for (const p of participants) {
    if (ids.has(p.id)) reasons.push(`معرّف مكرر: ${p.id}.`);
    ids.add(p.id);
  }

  let capacities: number[] = [];
  try {
    capacities = computeCapacities(participants.length, teamCount);
  } catch (error) {
    reasons.push(error instanceof Error ? error.message : 'عدد الفرق غير صالح.');
    return { feasible: false, reasons };
  }
  const smallest = Math.min(...capacities);

  for (const req of requirements) {
    if (!req.hard || req.minPerTeam < 1) continue;

    if (req.minPerTeam > smallest) {
      reasons.push(
        `شرط «${req.skill}» يطلب ${req.minPerTeam} في كل فريق، لكن أصغر فريق فيه ${smallest} أعضاء فقط.`,
      );
    }

    const qualifying = participants.filter((p) => {
      const level = p.skills[req.skill];
      return typeof level === 'number' && level >= req.minLevel;
    }).length;
    const needed = req.minPerTeam * teamCount;
    if (qualifying < needed) {
      reasons.push(
        `شرط «${req.skill}» بمستوى ${req.minLevel}+ يحتاج ${needed} مشاركًا مؤكدًا (${req.minPerTeam} × ${teamCount} فرق)، والموجود ${qualifying} فقط. ` +
          `يمكنك خفض الحد الأدنى للمستوى أو عدد المطلوب لكل فريق أو عدد الفرق، أو تأكيد مهارات المشاركين المجهولة.`,
      );
    }
  }

  return { feasible: reasons.length === 0, reasons };
}
