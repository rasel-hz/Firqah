// Shared types for the FIRQAH optimizer. No dependencies: this module must stay
// independent of the UI and of Llama so it can be tested on its own.

/** 0 = none, 1 = beginner, 2 = basic, 3 = intermediate, 4 = advanced, 5 = expert, null = unknown. */
export type SkillLevel = number | null;

export interface Participant {
  id: string;
  name: string;
  /** Skill name -> level. A missing key or null both mean "unknown" (never treated as 0). */
  skills: Record<string, SkillLevel>;
}

export interface SkillRequirement {
  skill: string;
  /** Relative importance. Normalized to sum to 100 internally. */
  weight: number;
  /** Minimum level that counts as "has this skill". */
  minLevel: number;
  /** How many qualifying members each team needs (0 = soft preference only). */
  minPerTeam: number;
  /** True only if the organizer explicitly approved it as a hard constraint. */
  hard: boolean;
}

/** assignment[teamIndex] = participant ids in that team. */
export type Assignment = string[][];

export interface RequirementCoverage {
  skill: string;
  teamsSatisfied: number;
  teamCount: number;
  /** teamsSatisfied / teamCount, 0..1 */
  ratio: number;
}

export interface TeamMetrics {
  teamId: string;
  size: number;
  /** Average level per member for each requirement skill (unknown counted as 0 for strength). */
  skillStrength: Record<string, number>;
  /** Members with level >= minLevel, per requirement skill. */
  qualifying: Record<string, number>;
  /** Requirement skills this team does not satisfy. */
  gaps: string[];
  /** Weighted experience per member. */
  experience: number;
}

export interface ScoreBreakdown {
  /** 0..100, deterministic. A rubric score against the selected criteria, not a probability. */
  overall: number;
  coverage: number;
  balance: number;
  experience: number;
  perRequirement: RequirementCoverage[];
  /** Share (0..1) of (participant, requirement-skill) cells whose level is unknown. */
  unknownRatio: number;
  hardViolations: number;
}

export interface Validation {
  valid: boolean;
  issues: string[];
}

export type OptimizeStatus = 'ok' | 'infeasible' | 'no_solution';

export interface OptimizeInput {
  participants: Participant[];
  requirements: SkillRequirement[];
  teamCount: number;
  seed?: number;
  /** Number of randomized initializations. Default 60. */
  restarts?: number;
  /** Swap attempts per restart. Default 600. */
  swapTrials?: number;
  /** Random valid assignments used for the baseline comparison. Default 200. */
  baselineRuns?: number;
}

export interface BaselineStats {
  runs: number;
  meanOverall: number;
  maxOverall: number;
  minOverall: number;
  /** Share of random assignments that satisfy every hard constraint. */
  validShare: number;
}

export interface OptimizeResult {
  status: OptimizeStatus;
  /** Plain-language reasons when status is not "ok". */
  reasons: string[];
  seed: number;
  capacities: number[];
  teams: { id: string; memberIds: string[] }[];
  score: ScoreBreakdown | null;
  teamMetrics: TeamMetrics[];
  validation: Validation;
  baseline: BaselineStats | null;
  search: { restarts: number; swapTrials: number; bestRestart: number };
}
