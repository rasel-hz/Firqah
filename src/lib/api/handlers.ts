// API logic, kept apart from Next so it can be tested on its own. Server-side only (imports the Llama client).
// Llama understands text and writes reviews; teams, metrics and feasibility always come from the optimizer.
import type { ZodType } from 'zod';
import { LlamaError, callLlamaJson } from '../llama/client.ts';
import type { LlamaConfig } from '../llama/client.ts';
import {
  CHALLENGE_ANALYSIS_SYSTEM,
  PARTICIPANT_EXTRACTION_SYSTEM,
  TEAM_REVIEW_SYSTEM,
  buildChallengeAnalysisUser,
  buildParticipantExtractionUser,
} from '../llama/prompts.ts';
import { reconcileProfiles } from '../llama/reconcile.ts';
import type { ReconciledProfile } from '../llama/reconcile.ts';
import { buildTeamReviewUser, reconcileReviews } from '../llama/review.ts';
import { challengeAnalysisSchema, normalizeSuggestedWeights, participantBatchSchema, teamReviewSchema } from '../llama/schemas.ts';
import { buildIndex, computeTeamMetrics, normalizeRequirements, optimizeTeams } from '../optimizer/index.ts';
import {
  analyzeChallengeRequest,
  analyzeParticipantsRequest,
  generateTeamsRequest,
  reviewTeamsRequest,
} from './requests.ts';

/** Tests inject these. In production they stay empty and the client reads the environment. */
export interface LlamaDeps {
  config?: LlamaConfig;
  fetchImpl?: typeof fetch;
}

/** A batch of 10 timed out at 120s on Cloudflare Workers AI once descriptions got richer, so batches stay small. */
const PARTICIPANT_BATCH_SIZE = 5;
const PARTICIPANT_CONCURRENCY = 3;
const LONG_CALL_TIMEOUT_MS = 120_000;

const LLAMA_STATUS: Record<LlamaError['code'], number> = {
  missing_config: 503,
  timeout: 504,
  rate_limited: 429,
  network: 502,
  provider_error: 502,
  invalid_output: 502,
};

class BadRequest extends Error {}

function errorResponse(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

/** Only messages written for users reach the browser. Details stay in the server log. */
function toErrorResponse(error: unknown): Response {
  if (error instanceof BadRequest) return errorResponse(400, 'bad_request', error.message);
  if (error instanceof LlamaError) {
    console.error(`[llama] ${error.code}`, error.detail ?? '');
    return errorResponse(LLAMA_STATUS[error.code], error.code, error.userMessage);
  }
  console.error('[api] unexpected error', error);
  return errorResponse(500, 'internal', 'حدث خطأ غير متوقع في الخادم. حاول مرة أخرى.');
}

async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new BadRequest('تعذّرت قراءة البيانات المرسلة.');
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((issue) => issue.path.join('.') || issue.message))];
    throw new BadRequest(`البيانات المرسلة غير صالحة: ${fields.slice(0, 5).join('، ')}`);
  }
  return parsed.data;
}

export async function handleAnalyzeChallenge(request: Request, deps: LlamaDeps = {}): Promise<Response> {
  try {
    const input = await parseBody(request, analyzeChallengeRequest);
    const analysis = await callLlamaJson({
      system: CHALLENGE_ANALYSIS_SYSTEM,
      user: buildChallengeAnalysisUser(input),
      validate: (data) => challengeAnalysisSchema.parse(data),
      timeoutMs: LONG_CALL_TIMEOUT_MS,
      ...deps,
    });
    return Response.json({
      analysis: { ...analysis, required_skills: normalizeSuggestedWeights(analysis.required_skills) },
      source: 'llama',
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * Sends participants in small batches. If only some batches fail, the good profiles are returned and the
 * failed people are listed in missingIds, so the organizer can retry or enter them manually.
 */
export async function handleAnalyzeParticipants(request: Request, deps: LlamaDeps = {}): Promise<Response> {
  try {
    const { approvedSkills, participants } = await parseBody(request, analyzeParticipantsRequest);
    const profiles: ReconciledProfile[] = [];
    const missingIds: string[] = [];
    const unexpectedIds: string[] = [];
    let lastFailure: unknown = null;

    const batches: (typeof participants)[] = [];
    for (let start = 0; start < participants.length; start += PARTICIPANT_BATCH_SIZE) {
      batches.push(participants.slice(start, start + PARTICIPANT_BATCH_SIZE));
    }

    const analyzeBatch = async (batch: typeof participants) => {
      const ids = batch.map((p) => p.id);
      try {
        const raw = await callLlamaJson({
          system: PARTICIPANT_EXTRACTION_SYSTEM,
          user: buildParticipantExtractionUser(approvedSkills, batch),
          validate: (data) => participantBatchSchema.parse(data),
          timeoutMs: LONG_CALL_TIMEOUT_MS,
          ...deps,
        });
        const result = reconcileProfiles(ids, approvedSkills, raw.profiles);
        profiles.push(...result.profiles);
        missingIds.push(...result.missingIds);
        unexpectedIds.push(...result.unexpectedIds);
      } catch (error) {
        if (!(error instanceof LlamaError)) throw error;
        if (error.code === 'missing_config') throw error; // every batch would fail the same way
        console.error(`[llama] ${error.code}`, error.detail ?? '');
        lastFailure = error;
        missingIds.push(...ids);
      }
    };

    // A few batches at once keeps one request short without flooding the provider.
    let next = 0;
    const worker = async () => {
      while (next < batches.length) await analyzeBatch(batches[next++]);
    };
    await Promise.all(Array.from({ length: PARTICIPANT_CONCURRENCY }, worker));

    if (profiles.length === 0 && lastFailure !== null) throw lastFailure;
    const order = new Map(participants.map((p, i) => [p.id, i]));
    const position = (id: string) => order.get(id) ?? 0;
    return Response.json({
      profiles: profiles.sort((a, b) => position(a.participantId) - position(b.participantId)),
      missingIds: missingIds.sort((a, b) => position(a) - position(b)),
      unexpectedIds,
      warning: lastFailure instanceof LlamaError ? lastFailure.userMessage : null,
      source: 'llama',
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** No Llama here. "infeasible" and "no_solution" are real answers, so they return 200 with their reasons. */
export async function handleGenerateTeams(request: Request): Promise<Response> {
  try {
    const input = await parseBody(request, generateTeamsRequest);
    return Response.json(optimizeTeams(input));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function handleReviewTeams(request: Request, deps: LlamaDeps = {}): Promise<Response> {
  try {
    const { challenge, participants, requirements, teams } = await parseBody(request, reviewTeamsRequest);

    const index = buildIndex(participants);
    const seen = new Set<string>();
    for (const team of teams) {
      for (const id of team.memberIds) {
        if (!index.has(id)) throw new BadRequest(`معرّف غير معروف في الفريق ${team.id}: ${id}`);
        if (seen.has(id)) throw new BadRequest(`المشارك ${id} ظهر في أكثر من فريق.`);
        seen.add(id);
      }
    }

    // Metrics are recomputed here, so a review can only be based on numbers the optimizer produced.
    const reqs = normalizeRequirements(requirements);
    const metrics = computeTeamMetrics(index, teams.map((t) => t.memberIds), reqs);
    const reviewTeams = teams.map((team, i) => ({
      id: team.id,
      metrics: { ...metrics[i], teamId: team.id },
      members: team.memberIds.map((id) => {
        const p = participants.find((x) => x.id === id) as (typeof participants)[number];
        return {
          id: p.id,
          name: p.name,
          skills: Object.fromEntries(
            reqs.map((r) => [r.skill, { level: p.skills[r.skill] ?? null, evidence: p.evidence?.[r.skill] ?? null }]),
          ),
        };
      }),
    }));

    const raw = await callLlamaJson({
      system: TEAM_REVIEW_SYSTEM,
      user: buildTeamReviewUser({ challenge, teams: reviewTeams }),
      validate: (data) => teamReviewSchema.parse(data),
      timeoutMs: LONG_CALL_TIMEOUT_MS,
      ...deps,
    });
    const metSkills = Object.fromEntries(
      reviewTeams.map((team) => [team.id, reqs.map((r) => r.skill).filter((skill) => !team.metrics.gaps.includes(skill))]),
    );
    const result = reconcileReviews(teams.map((t) => t.id), raw.reviews, metSkills);
    return Response.json({ ...result, source: 'llama' });
  } catch (error) {
    return toErrorResponse(error);
  }
}
