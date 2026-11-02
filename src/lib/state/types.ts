// The shape of what the app keeps in localStorage.
import type { OptimizeResult, Participant, SkillRequirement } from '../optimizer/types.ts';

/** Where a value came from. The UI labels this, so manual data is never shown as AI output. */
export type Source = 'llama' | 'manual';

export interface ChallengeSkill {
  skill: string;
  weight: number;
  minLevel: number;
  minPerTeam: number;
  /** True only when the organizer ticked it. Llama can never set this. */
  hard: boolean;
  importance: 'critical' | 'high' | 'medium' | 'low' | null;
  reason: string | null;
  source: Source;
}

export interface ProfileSkill {
  name: string;
  level: number | null;
  confidence: number;
  evidence: string | null;
  /** null: nobody has provided a value for this skill yet. */
  source: Source | null;
  /** Llama marked it uncertain. Until confirmed it counts as unknown in the optimizer. */
  flagged: boolean;
  /** The organizer entered or approved this value. */
  confirmed: boolean;
}

export interface StoredParticipant {
  id: string;
  name: string;
  description: string;
  skills: ProfileSkill[];
  /** Whether Llama has returned a profile for this person. */
  analyzed: boolean;
}

export interface ChallengeAnalysisInfo {
  challengeType: string;
  objective: string;
  missingInformation: string[];
  recommendations: string[];
}

export type RunParticipant = Participant & { evidence: Record<string, string | null> };

export interface TeamReviewEntry {
  team_id: string;
  strengths: string[];
  gaps: string[];
  risks: string[];
  recommendations: string[];
  summary: string;
}

export interface GenerationRun {
  id: string;
  createdAt: string;
  /** The exact input used, so a saved result stays consistent even after later edits. */
  input: { participants: RunParticipant[]; requirements: SkillRequirement[]; teamCount: number };
  result: OptimizeResult;
  /** Only ever filled from a real Llama reply. */
  review: { reviews: TeamReviewEntry[]; missingTeamIds: string[] } | null;
  reviewError: string | null;
}

export interface Challenge {
  id: string;
  createdAt: string;
  name: string;
  description: string;
  objective: string;
  plannedParticipants: number;
  teamCount: number;
  analysis: ChallengeAnalysisInfo | null;
  skills: ChallengeSkill[];
  participants: StoredParticipant[];
  /** Newest first. */
  runs: GenerationRun[];
}
