import { computeCapacities } from './capacity.ts';
import { checkFeasibility } from './feasibility.ts';
import { createRng, randInt, shuffle } from './rng.ts';
import {
  buildIndex,
  computeScore,
  computeTeamMetrics,
  countHardViolations,
  normalizeRequirements,
  validateAssignment,
} from './scoring.ts';
import type {
  Assignment,
  BaselineStats,
  OptimizeInput,
  OptimizeResult,
  Participant,
  SkillRequirement,
} from './types.ts';

const DEFAULT_SEED = 20260101;
const DEFAULT_RESTARTS = 60;
const DEFAULT_SWAP_TRIALS = 600;
const DEFAULT_BASELINE_RUNS = 200;
/** Large enough that any hard violation outweighs every possible score gain. */
const VIOLATION_PENALTY = 1000;

type Index = Map<string, Participant>;

function objective(index: Index, assignment: Assignment, reqs: SkillRequirement[]): number {
  const score = computeScore(index, assignment, reqs);
  return score.overall - VIOLATION_PENALTY * score.hardViolations;
}

function qualifiesFor(p: Participant, req: SkillRequirement): boolean {
  const level = p.skills[req.skill];
  return typeof level === 'number' && level >= req.minLevel;
}

/**
 * Scarcity-aware greedy initialization.
 * Participants holding scarce, heavily weighted skills are placed first, each into the
 * team that is currently weakest and, where a hard rule is still unmet, still needs them.
 */
function greedyInit(
  participants: Participant[],
  reqs: SkillRequirement[],
  capacities: number[],
  rng: () => number,
): Assignment {
  const teamCount = capacities.length;

  const qualifyingCount = new Map<string, number>();
  for (const req of reqs) {
    qualifyingCount.set(req.skill, participants.filter((p) => qualifiesFor(p, req)).length);
  }

  const value = (p: Participant): number =>
    reqs.reduce((sum, req) => {
      const level = p.skills[req.skill];
      const scarcity = 1 + teamCount / (1 + (qualifyingCount.get(req.skill) ?? 0));
      return sum + req.weight * (typeof level === 'number' ? level : 0) * scarcity;
    }, 0);

  const values = participants.map(value);
  const jitter = (Math.max(...values, 1) || 1) * 0.15;
  const order = participants
    .map((p, i) => ({ p, key: values[i] + rng() * jitter }))
    .sort((a, b) => b.key - a.key)
    .map((x) => x.p);

  const teams: Assignment = Array.from({ length: teamCount }, () => []);
  const load: number[] = new Array(teamCount).fill(0);
  const haveQualifying: number[][] = Array.from({ length: teamCount }, () =>
    new Array(reqs.length).fill(0),
  );

  for (const p of order) {
    let bestTeam = -1;
    let bestCost = Infinity;
    for (let t = 0; t < teamCount; t++) {
      if (teams[t].length >= capacities[t]) continue;
      let bonus = 0;
      reqs.forEach((req, r) => {
        if (req.hard && req.minPerTeam > 0 && haveQualifying[t][r] < req.minPerTeam && qualifiesFor(p, req)) {
          bonus += VIOLATION_PENALTY;
        }
      });
      const cost = load[t] / capacities[t] - bonus + rng() * 0.01;
      if (cost < bestCost) {
        bestCost = cost;
        bestTeam = t;
      }
    }
    teams[bestTeam].push(p.id);
    reqs.forEach((req, r) => {
      const level = p.skills[req.skill];
      load[bestTeam] += req.weight * (typeof level === 'number' ? level : 0);
      if (qualifiesFor(p, req)) haveQualifying[bestTeam][r]++;
    });
  }
  return teams;
}

/** Randomized local search: swap one member between two teams, keep strict improvements. */
function localSearch(
  index: Index,
  start: Assignment,
  reqs: SkillRequirement[],
  swapTrials: number,
  rng: () => number,
): { assignment: Assignment; value: number } {
  const teamCount = start.length;
  const current = start.map((t) => t.slice());
  let currentValue = objective(index, current, reqs);
  if (teamCount < 2) return { assignment: current, value: currentValue };

  for (let trial = 0; trial < swapTrials; trial++) {
    const a = randInt(rng, teamCount);
    let b = randInt(rng, teamCount - 1);
    if (b >= a) b++;
    if (current[a].length === 0 || current[b].length === 0) continue;
    const i = randInt(rng, current[a].length);
    const j = randInt(rng, current[b].length);

    const tmp = current[a][i];
    current[a][i] = current[b][j];
    current[b][j] = tmp;

    const candidate = objective(index, current, reqs);
    if (candidate > currentValue + 1e-9) {
      currentValue = candidate;
    } else {
      current[b][j] = current[a][i];
      current[a][i] = tmp;
    }
  }
  return { assignment: current, value: currentValue };
}

function randomAssignment(participants: Participant[], capacities: number[], rng: () => number): Assignment {
  const shuffled = shuffle(participants, rng);
  const teams: Assignment = [];
  let cursor = 0;
  for (const cap of capacities) {
    teams.push(shuffled.slice(cursor, cursor + cap).map((p) => p.id));
    cursor += cap;
  }
  return teams;
}

/** Random valid assignments scored with the same function, so the comparison is honest. */
function computeBaseline(
  index: Index,
  participants: Participant[],
  capacities: number[],
  reqs: SkillRequirement[],
  runs: number,
  rng: () => number,
): BaselineStats {
  const scores: number[] = [];
  let valid = 0;
  for (let i = 0; i < runs; i++) {
    const assignment = randomAssignment(participants, capacities, rng);
    const score = computeScore(index, assignment, reqs);
    scores.push(score.overall);
    if (score.hardViolations === 0) valid++;
  }
  const sum = scores.reduce((a, b) => a + b, 0);
  return {
    runs,
    meanOverall: Math.round((sum / runs) * 100) / 100,
    maxOverall: Math.max(...scores),
    minOverall: Math.min(...scores),
    validShare: Math.round((valid / runs) * 100) / 100,
  };
}

function emptyResult(
  seed: number,
  status: OptimizeResult['status'],
  reasons: string[],
  capacities: number[],
  restarts: number,
  swapTrials: number,
): OptimizeResult {
  return {
    status,
    reasons,
    seed,
    capacities,
    teams: [],
    score: null,
    teamMetrics: [],
    validation: { valid: false, issues: reasons },
    baseline: null,
    search: { restarts, swapTrials, bestRestart: -1 },
  };
}

/**
 * Finds the best valid arrangement within the search budget. It does not claim the global
 * optimum. If a hard requirement cannot be met it says so instead of returning a result
 * that quietly breaks it.
 */
export function optimizeTeams(input: OptimizeInput): OptimizeResult {
  const seed = input.seed ?? DEFAULT_SEED;
  const restarts = input.restarts ?? DEFAULT_RESTARTS;
  const swapTrials = input.swapTrials ?? DEFAULT_SWAP_TRIALS;
  const baselineRuns = input.baselineRuns ?? DEFAULT_BASELINE_RUNS;

  const feasibility = checkFeasibility(input.participants, input.requirements, input.teamCount);
  if (!feasibility.feasible) {
    let capacities: number[] = [];
    try {
      capacities = computeCapacities(input.participants.length, input.teamCount);
    } catch {
      capacities = [];
    }
    return emptyResult(seed, 'infeasible', feasibility.reasons, capacities, restarts, swapTrials);
  }

  const capacities = computeCapacities(input.participants.length, input.teamCount);
  const reqs = normalizeRequirements(input.requirements);
  const index = buildIndex(input.participants);
  const rng = createRng(seed);

  let best: Assignment | null = null;
  let bestValue = -Infinity;
  let bestRestart = -1;

  for (let r = 0; r < restarts; r++) {
    const start = greedyInit(input.participants, reqs, capacities, rng);
    const result = localSearch(index, start, reqs, swapTrials, rng);
    if (result.value > bestValue + 1e-9) {
      best = result.assignment;
      bestValue = result.value;
      bestRestart = r;
    }
  }

  if (best === null) {
    return emptyResult(seed, 'no_solution', ['لم يتمكن البحث من إنتاج توزيع.'], capacities, restarts, swapTrials);
  }

  const violations = countHardViolations(index, best, reqs);
  if (violations > 0) {
    const reasons = [
      `لم يجد البحث توزيعًا يحقق كل الشروط الإلزامية خلال حدوده (${restarts} محاولة). ` +
        `راجع الشروط الإلزامية أو خفّف أحدها، فالشروط المتداخلة قد تكون غير قابلة للتحقيق معًا.`,
    ];
    return {
      ...emptyResult(seed, 'no_solution', reasons, capacities, restarts, swapTrials),
      search: { restarts, swapTrials, bestRestart },
    };
  }

  const validation = validateAssignment(input.participants, best, capacities, reqs);
  return {
    status: validation.valid ? 'ok' : 'no_solution',
    reasons: validation.valid ? [] : validation.issues,
    seed,
    capacities,
    teams: best.map((memberIds, i) => ({ id: `T${String(i + 1).padStart(2, '0')}`, memberIds })),
    score: computeScore(index, best, reqs),
    teamMetrics: computeTeamMetrics(index, best, reqs),
    validation,
    baseline: computeBaseline(index, input.participants, capacities, reqs, baselineRuns, rng),
    search: { restarts, swapTrials, bestRestart },
  };
}
