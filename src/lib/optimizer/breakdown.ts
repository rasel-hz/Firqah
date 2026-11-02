import type { SkillRequirement, TeamMetrics } from './types.ts';

/**
 * Share of the requirement weight this team covers, 0..100. It reads the gaps the optimizer
 * already computed. Balance is not included because it only has meaning across teams.
 */
export function teamCoverage(metrics: TeamMetrics, requirements: SkillRequirement[]): number {
  const total = requirements.reduce((sum, r) => sum + Math.max(0, r.weight), 0);
  if (requirements.length === 0) return 0;
  const met = requirements.filter((r) => !metrics.gaps.includes(r.skill));
  const share =
    total > 0 ? met.reduce((sum, r) => sum + Math.max(0, r.weight), 0) / total : met.length / requirements.length;
  return Math.round(share * 10000) / 100;
}
