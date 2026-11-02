// Rules for turning stored profiles into optimizer input. Pure, so the "unknown is never a guess" rule is tested.
import type { ReconciledProfile } from '../llama/reconcile.ts';
import type { SkillRequirement } from '../optimizer/types.ts';
import type { ChallengeSkill, ProfileSkill, RunParticipant, StoredParticipant } from './types.ts';

export function blankSkill(name: string): ProfileSkill {
  return { name, level: null, confidence: 0, evidence: null, source: null, flagged: false, confirmed: false };
}

/** The level the optimizer may use. An uncertain AI guess stays unknown until the organizer confirms it. */
export function effectiveLevel(skill: ProfileSkill): number | null {
  if (skill.confirmed) return skill.level;
  return skill.flagged ? null : skill.level;
}

/** A guess that exists but is not usable yet, because it is waiting for the organizer. */
export function isPendingConfirmation(skill: ProfileSkill): boolean {
  return !skill.confirmed && skill.flagged && skill.level !== null;
}

/** One entry per approved skill, in order. Skills removed from the challenge are not shown or used. */
export function alignSkills(participant: StoredParticipant, skillNames: string[]): ProfileSkill[] {
  return skillNames.map((name) => participant.skills.find((s) => s.name === name) ?? blankSkill(name));
}

export function setManualLevel(participant: StoredParticipant, name: string, level: number | null): StoredParticipant {
  const current = participant.skills.find((s) => s.name === name) ?? blankSkill(name);
  const updated: ProfileSkill = { ...current, level, source: 'manual', flagged: false, confirmed: true };
  return {
    ...participant,
    skills: participant.skills.some((s) => s.name === name)
      ? participant.skills.map((s) => (s.name === name ? updated : s))
      : [...participant.skills, updated],
  };
}

export function confirmLevel(participant: StoredParticipant, name: string): StoredParticipant {
  return {
    ...participant,
    skills: participant.skills.map((s) => (s.name === name ? { ...s, flagged: false, confirmed: true } : s)),
  };
}

/** Applies a Llama profile. Anything the organizer already entered or approved is kept. */
export function applyProfile(participant: StoredParticipant, profile: ReconciledProfile): StoredParticipant {
  const fromLlama: ProfileSkill[] = profile.skills.map((s) => ({
    name: s.name,
    level: s.level,
    confidence: s.confidence,
    evidence: s.evidence,
    source: 'llama',
    flagged: profile.needsConfirmation.includes(s.name),
    confirmed: false,
  }));
  const kept = participant.skills.filter((s) => s.confirmed);
  const keptNames = new Set(kept.map((s) => s.name));
  return { ...participant, analyzed: true, skills: [...kept, ...fromLlama.filter((s) => !keptNames.has(s.name))] };
}

export function toRequirements(skills: ChallengeSkill[]): SkillRequirement[] {
  return skills.map((s) => ({
    skill: s.skill,
    weight: s.weight,
    minLevel: s.minLevel,
    // A hard rule that asks for nobody would have no effect, so a ticked rule needs at least one member.
    minPerTeam: s.hard ? Math.max(1, s.minPerTeam) : s.minPerTeam,
    hard: s.hard,
  }));
}

export function toRunParticipants(participants: StoredParticipant[], skillNames: string[]): RunParticipant[] {
  return participants.map((p) => {
    const aligned = alignSkills(p, skillNames);
    return {
      id: p.id,
      name: p.name,
      skills: Object.fromEntries(aligned.map((s) => [s.name, effectiveLevel(s)])),
      evidence: Object.fromEntries(aligned.map((s) => [s.name, effectiveLevel(s) === null ? null : s.evidence])),
    };
  });
}

/** Weights shown to the organizer, normalized to sum to 100. */
export function normalizedWeights(skills: { weight: number }[]): number[] {
  const total = skills.reduce((sum, s) => sum + Math.max(0, s.weight), 0);
  if (skills.length === 0) return [];
  return skills.map((s) => Math.round((total > 0 ? (Math.max(0, s.weight) / total) * 100 : 100 / skills.length) * 10) / 10);
}

export function nextParticipantId(participants: { id: string }[]): string {
  const highest = participants.reduce((max, p) => {
    const n = Number(p.id.replace(/^P/, ''));
    return Number.isInteger(n) && n > max ? n : max;
  }, 0);
  return `P${String(highest + 1).padStart(3, '0')}`;
}
