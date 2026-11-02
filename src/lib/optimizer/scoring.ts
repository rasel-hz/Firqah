import type {
  Assignment,
  Participant,
  RequirementCoverage,
  ScoreBreakdown,
  SkillRequirement,
  TeamMetrics,
  Validation,
} from './types.ts';

/** Default component weights (sum = 1). These are defaults, not universal truths. */
export const SCORE_WEIGHTS = { coverage: 0.45, balance: 0.4, experience: 0.15 } as const;

export function normalizeRequirements(requirements: SkillRequirement[]): SkillRequirement[] {
  const cleaned = requirements.filter((r) => r.skill.trim().length > 0);
  const total = cleaned.reduce((sum, r) => sum + Math.max(0, r.weight), 0);
  return cleaned.map((r) => ({
    ...r,
    weight: total > 0 ? (Math.max(0, r.weight) / total) * 100 : 100 / cleaned.length,
  }));
}

export function buildIndex(participants: Participant[]): Map<string, Participant> {
  return new Map(participants.map((p) => [p.id, p]));
}

function levelOf(p: Participant, skill: string): number | null {
  const value = p.skills[skill];
  return typeof value === 'number' ? value : null;
}

/** A member "qualifies" only with a confirmed level. Unknown (null) never qualifies. */
function qualifies(p: Participant, req: SkillRequirement): boolean {
  const level = levelOf(p, req.skill);
  return level !== null && level >= req.minLevel;
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

/** 1 = perfectly even, 0 = very uneven. Zero-mean (nobody has the skill) counts as even. */
function evenness(values: number[]): number {
  const m = mean(values);
  if (m === 0) return 1;
  return Math.max(0, 1 - stdDev(values) / m);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** How many (team, requirement) slots fall short of a hard minPerTeam. Zero means all hard rules hold. */
export function countHardViolations(
  index: Map<string, Participant>,
  assignment: Assignment,
  requirements: SkillRequirement[],
): number {
  let violations = 0;
  for (const req of requirements) {
    if (!req.hard || req.minPerTeam < 1) continue;
    for (const team of assignment) {
      const have = team.filter((id) => qualifies(index.get(id) as Participant, req)).length;
      if (have < req.minPerTeam) violations += req.minPerTeam - have;
    }
  }
  return violations;
}

export function computeScore(
  index: Map<string, Participant>,
  assignment: Assignment,
  requirements: SkillRequirement[],
): ScoreBreakdown {
  const reqs = requirements;
  const teamCount = assignment.length;
  const totalWeight = reqs.reduce((s, r) => s + r.weight, 0) || 1;

  // Coverage: share of teams satisfying each requirement, weighted.
  const perRequirement: RequirementCoverage[] = [];
  let coverageSum = 0;
  for (const req of reqs) {
    const target = Math.max(req.minPerTeam, 1);
    let satisfied = 0;
    for (const team of assignment) {
      const have = team.filter((id) => qualifies(index.get(id) as Participant, req)).length;
      if (have >= target) satisfied++;
    }
    const ratio = teamCount === 0 ? 0 : satisfied / teamCount;
    perRequirement.push({ skill: req.skill, teamsSatisfied: satisfied, teamCount, ratio });
    coverageSum += (req.weight / totalWeight) * ratio;
  }
  const coverage = coverageSum * 100;

  // Balance: how evenly each skill's per-member strength is spread across teams.
  let balanceSum = 0;
  for (const req of reqs) {
    const strengths = assignment.map((team) =>
      team.length === 0
        ? 0
        : team.reduce((s, id) => s + (levelOf(index.get(id) as Participant, req.skill) ?? 0), 0) /
          team.length,
    );
    balanceSum += (req.weight / totalWeight) * evenness(strengths);
  }
  const balance = balanceSum * 100;

  // Experience: weighted level per member, evenness across teams.
  const experiences = assignment.map((team) =>
    team.length === 0
      ? 0
      : team.reduce((s, id) => {
          const p = index.get(id) as Participant;
          return s + reqs.reduce((a, r) => a + (r.weight / totalWeight) * (levelOf(p, r.skill) ?? 0), 0);
        }, 0) / team.length,
  );
  const experience = evenness(experiences) * 100;

  // Unknown data: how much of the input the score had to treat as "not confirmed".
  let cells = 0;
  let unknown = 0;
  for (const team of assignment) {
    for (const id of team) {
      const p = index.get(id) as Participant;
      for (const req of reqs) {
        cells++;
        if (levelOf(p, req.skill) === null) unknown++;
      }
    }
  }

  const overall =
    coverage * SCORE_WEIGHTS.coverage +
    balance * SCORE_WEIGHTS.balance +
    experience * SCORE_WEIGHTS.experience;

  return {
    overall: round2(Math.min(100, Math.max(0, overall))),
    coverage: round2(coverage),
    balance: round2(balance),
    experience: round2(experience),
    perRequirement,
    unknownRatio: cells === 0 ? 0 : round2(unknown / cells),
    hardViolations: countHardViolations(index, assignment, reqs),
  };
}

export function computeTeamMetrics(
  index: Map<string, Participant>,
  assignment: Assignment,
  requirements: SkillRequirement[],
): TeamMetrics[] {
  const totalWeight = requirements.reduce((s, r) => s + r.weight, 0) || 1;
  return assignment.map((team, i) => {
    const skillStrength: Record<string, number> = {};
    const qualifying: Record<string, number> = {};
    const gaps: string[] = [];
    for (const req of requirements) {
      const members = team.map((id) => index.get(id) as Participant);
      skillStrength[req.skill] = round2(mean(members.map((m) => levelOf(m, req.skill) ?? 0)));
      const have = members.filter((m) => qualifies(m, req)).length;
      qualifying[req.skill] = have;
      if (have < Math.max(req.minPerTeam, 1)) gaps.push(req.skill);
    }
    const experience = round2(
      mean(
        team.map((id) => {
          const p = index.get(id) as Participant;
          return requirements.reduce(
            (a, r) => a + (r.weight / totalWeight) * (levelOf(p, r.skill) ?? 0),
            0,
          );
        }),
      ),
    );
    return {
      teamId: `T${String(i + 1).padStart(2, '0')}`,
      size: team.length,
      skillStrength,
      qualifying,
      gaps,
      experience,
    };
  });
}

/** Independent check of every hard rule. Reported separately from the score. */
export function validateAssignment(
  participants: Participant[],
  assignment: Assignment,
  capacities: number[],
  requirements: SkillRequirement[],
): Validation {
  const issues: string[] = [];
  const index = buildIndex(participants);

  const seen = new Map<string, number>();
  for (const team of assignment) {
    for (const id of team) seen.set(id, (seen.get(id) ?? 0) + 1);
  }
  for (const p of participants) {
    const count = seen.get(p.id) ?? 0;
    if (count === 0) issues.push(`المشارك ${p.name} غير موزّع على أي فريق.`);
    if (count > 1) issues.push(`المشارك ${p.name} ظهر في أكثر من فريق.`);
  }
  for (const id of seen.keys()) {
    if (!index.has(id)) issues.push(`معرّف غير معروف في الفرق: ${id}.`);
  }

  if (assignment.length !== capacities.length) {
    issues.push('عدد الفرق لا يطابق السعات المطلوبة.');
  } else {
    assignment.forEach((team, i) => {
      if (team.length !== capacities[i]) {
        issues.push(`حجم الفريق ${i + 1} هو ${team.length} بينما المطلوب ${capacities[i]}.`);
      }
    });
  }

  for (const req of requirements) {
    if (!req.hard || req.minPerTeam < 1) continue;
    assignment.forEach((team, i) => {
      const have = team.filter((id) => {
        const p = index.get(id);
        return p ? qualifies(p, req) : false;
      }).length;
      if (have < req.minPerTeam) {
        issues.push(
          `الفريق ${i + 1} لا يحقق شرط «${req.skill}» (المطلوب ${req.minPerTeam} بمستوى ${req.minLevel}+، الموجود ${have}).`,
        );
      }
    });
  }

  return { valid: issues.length === 0, issues };
}
