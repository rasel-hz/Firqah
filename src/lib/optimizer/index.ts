export { teamCoverage } from './breakdown.ts';
export { computeCapacities } from './capacity.ts';
export { checkFeasibility } from './feasibility.ts';
export { optimizeTeams } from './engine.ts';
export {
  SCORE_WEIGHTS,
  buildIndex,
  computeScore,
  computeTeamMetrics,
  normalizeRequirements,
  validateAssignment,
} from './scoring.ts';
export type * from './types.ts';
