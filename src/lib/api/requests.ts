// Zod schemas for what the browser may send to the API routes.
import { z } from 'zod';

/** Ids are placed inside prompt tags, so only plain characters are allowed. */
const participantId = z.string().regex(/^[\w-]{1,64}$/);
const skillName = z.string().trim().min(1).max(80);
const level = z.number().min(0).max(5).nullable();

/** Limits keep one request from blocking the server or sending huge prompts. */
const MAX_PARTICIPANTS = 300;

function hasUniqueIds(items: { id: string }[]): boolean {
  return new Set(items.map((x) => x.id)).size === items.length;
}

export const analyzeChallengeRequest = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(5000),
  objective: z.string().trim().max(1000).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const analyzeParticipantsRequest = z.object({
  approvedSkills: z.array(skillName).min(1).max(20),
  participants: z
    .array(z.object({ id: participantId, description: z.string().trim().min(1).max(5000) }))
    .min(1)
    .max(MAX_PARTICIPANTS)
    .refine(hasUniqueIds, 'duplicate participant id'),
});

const participant = z.object({
  id: participantId,
  name: z.string().trim().min(1).max(200),
  skills: z.record(z.string(), level),
});

const requirement = z.object({
  skill: skillName,
  weight: z.number().min(0).max(100),
  minLevel: z.number().min(0).max(5),
  minPerTeam: z.number().int().min(0).max(10),
  hard: z.boolean(),
});

export const generateTeamsRequest = z.object({
  participants: z.array(participant).min(1).max(MAX_PARTICIPANTS).refine(hasUniqueIds, 'duplicate participant id'),
  requirements: z.array(requirement).min(1).max(20),
  teamCount: z.number().int().min(1).max(MAX_PARTICIPANTS),
  seed: z.number().int().optional(),
});

export const reviewTeamsRequest = z.object({
  challenge: z
    .object({ name: z.string().trim().min(1).max(200), objective: z.string().trim().max(1000).optional() })
    .optional(),
  participants: z
    .array(
      participant.extend({
        /** Skill name -> the evidence text for that skill, when there is any. */
        evidence: z.record(z.string(), z.string().max(2000).nullable()).optional(),
      }),
    )
    .min(1)
    .max(MAX_PARTICIPANTS)
    .refine(hasUniqueIds, 'duplicate participant id'),
  requirements: z.array(requirement).min(1).max(20),
  teams: z
    .array(z.object({ id: z.string().regex(/^[\w-]{1,32}$/), memberIds: z.array(participantId).min(1) }))
    .min(1)
    .max(MAX_PARTICIPANTS)
    .refine(hasUniqueIds, 'duplicate team id'),
});
