// Zod schemas that define exactly what Llama is expected to return.
// Anything that does not match is rejected (after one repair attempt, see client.ts).
import { z } from 'zod';

const level = z.number().min(0).max(5);

export const challengeAnalysisSchema = z.object({
  challenge_type: z.string().min(1),
  objective: z.string(),
  required_skills: z
    .array(
      z.object({
        skill: z.string().min(1),
        weight: z.number().min(0).max(100),
        importance: z.enum(['critical', 'high', 'medium', 'low']),
        suggested_minimum_level: level,
        suggested_minimum_per_team: z.number().min(0).max(5),
        reason: z.string(),
      }),
    )
    .min(1)
    .max(10),
  missing_information: z.array(z.string()),
  recommendations: z.array(z.string()),
});
export type ChallengeAnalysis = z.infer<typeof challengeAnalysisSchema>;

export const participantBatchSchema = z.object({
  profiles: z.array(
    z.object({
      participant_id: z.string().min(1),
      skills: z.array(
        z.object({
          name: z.string().min(1),
          level: level.nullable(),
          // Models often write null here for an unknown skill. No confidence means 0, so nothing passes as certain.
          confidence: z.number().min(0).max(1).nullable().transform((value) => value ?? 0),
          evidence: z.string().nullable(),
        }),
      ),
      needs_confirmation: z.array(z.string()),
    }),
  ),
});
export type ParticipantBatch = z.infer<typeof participantBatchSchema>;

export const teamReviewSchema = z.object({
  reviews: z.array(
    z.object({
      team_id: z.string().min(1),
      strengths: z.array(z.string()),
      gaps: z.array(z.string()),
      risks: z.array(z.string()),
      recommendations: z.array(z.string()),
      summary: z.string(),
    }),
  ),
});
export type TeamReview = z.infer<typeof teamReviewSchema>;

/** Weights from Llama are suggestions: normalize them to sum to 100 before the organizer edits them. */
export function normalizeSuggestedWeights<T extends { weight: number }>(skills: T[]): T[] {
  const total = skills.reduce((s, x) => s + x.weight, 0);
  if (total <= 0) return skills.map((s) => ({ ...s, weight: Math.round(100 / skills.length) }));
  return skills.map((s) => ({ ...s, weight: Math.round((s.weight / total) * 1000) / 10 }));
}
