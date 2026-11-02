// Post-processing for Llama's participant extraction. Pure and dependency-free.
// Llama output is never trusted as-is: every participant id is checked, skills outside the
// approved list are dropped, levels are clamped, and uncertain values are flagged for the organizer.

export interface RawSkill {
  name: string;
  level: number | null;
  confidence: number;
  evidence: string | null;
}

export interface RawProfile {
  participant_id: string;
  skills: RawSkill[];
  needs_confirmation: string[];
}

export interface ReconciledProfile {
  participantId: string;
  skills: { name: string; level: number | null; confidence: number; evidence: string | null }[];
  /** Skills the organizer should confirm: unknown, or confidence below the threshold. */
  needsConfirmation: string[];
  source: 'llama';
}

export interface ReconcileResult {
  profiles: ReconciledProfile[];
  /** Requested participants Llama did not return. They must be retried or entered manually. */
  missingIds: string[];
  /** Ids Llama returned that were never requested. Dropped. */
  unexpectedIds: string[];
}

export const LOW_CONFIDENCE = 0.6;

const NOT_MENTIONED = /لا\s*(يوجد\s*)?ذكر|لم\s*(يتم\s*)?(يذكر|تذكر|يُذكر|ذكر)|غير\s*مذكور|not\s+mentioned|no\s+mention/i;

export function reconcileProfiles(
  requestedIds: string[],
  approvedSkills: string[],
  raw: RawProfile[],
): ReconcileResult {
  const requested = new Set(requestedIds);
  const approved = new Map(approvedSkills.map((s) => [s.toLowerCase(), s]));
  const byId = new Map<string, ReconciledProfile>();
  const unexpected: string[] = [];

  for (const item of raw) {
    if (!requested.has(item.participant_id)) {
      unexpected.push(item.participant_id);
      continue;
    }
    if (byId.has(item.participant_id)) continue; // keep the first answer for a repeated id

    const skills: ReconciledProfile['skills'] = [];
    const flagged = new Set<string>();
    for (const skill of item.skills) {
      const canonical = approved.get(skill.name.trim().toLowerCase());
      if (!canonical) continue; // skills outside the approved list are ignored
      const level =
        skill.level === null || !Number.isFinite(skill.level)
          ? null
          : Math.min(5, Math.max(0, Math.round(skill.level)));
      const confidence = Math.min(1, Math.max(0, skill.confidence));
      const evidence = skill.evidence && skill.evidence.trim() !== '' ? skill.evidence.trim() : null;

      // A level without evidence is a guess; do not let it pass as fact.
      // "Not mentioned" is also no evidence: silence about a skill means unknown, not 0.
      const unsupported = level !== null && (evidence === null || NOT_MENTIONED.test(evidence));
      skills.push({
        name: canonical,
        level: unsupported ? null : level,
        confidence: unsupported ? Math.min(confidence, 0.3) : confidence,
        evidence: unsupported ? null : evidence,
      });
      if (level === null || unsupported || confidence < LOW_CONFIDENCE) flagged.add(canonical);
    }

    // Approved skills Llama did not mention at all are unknown, and are flagged too.
    for (const name of approved.values()) {
      if (!skills.some((s) => s.name === name)) {
        skills.push({ name, level: null, confidence: 0, evidence: null });
        flagged.add(name);
      }
    }
    for (const name of item.needs_confirmation) {
      const canonical = approved.get(name.trim().toLowerCase());
      if (canonical) flagged.add(canonical);
    }

    byId.set(item.participant_id, {
      participantId: item.participant_id,
      skills,
      needsConfirmation: [...flagged],
      source: 'llama',
    });
  }

  const profiles = requestedIds.flatMap((id) => (byId.has(id) ? [byId.get(id) as ReconciledProfile] : []));
  const missingIds = requestedIds.filter((id) => !byId.has(id));
  return { profiles, missingIds, unexpectedIds: unexpected };
}
