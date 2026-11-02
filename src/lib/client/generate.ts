import type { OptimizeResult } from '../optimizer/types.ts';
import { toRequirements, toRunParticipants } from '../state/profiles.ts';
import { makeId } from '../state/store.ts';
import type { Challenge, GenerationRun } from '../state/types.ts';
import { postJson } from './api.ts';
import type { ApiResult } from './api.ts';

export function buildRunInput(challenge: Challenge): GenerationRun['input'] {
  return {
    participants: toRunParticipants(challenge.participants, challenge.skills.map((s) => s.skill)),
    requirements: toRequirements(challenge.skills),
    teamCount: challenge.teamCount,
  };
}

/** The teams always come from the optimizer route. No seed means the default fixed seed. */
export async function generateRun(challenge: Challenge, seed?: number): Promise<ApiResult<GenerationRun>> {
  const input = buildRunInput(challenge);
  const result = await postJson<OptimizeResult>('/api/generate-teams', {
    participants: input.participants.map(({ id, name, skills }) => ({ id, name, skills })),
    requirements: input.requirements,
    teamCount: input.teamCount,
    seed,
  });
  if (!result.ok) return result;
  return {
    ok: true,
    data: { id: makeId(), createdAt: new Date().toISOString(), input, result: result.data, review: null, reviewError: null },
  };
}
