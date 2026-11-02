import assert from 'node:assert/strict';
import { test } from 'node:test';
import { teamCoverage } from '../optimizer/breakdown.ts';
import {
  applyProfile,
  blankSkill,
  confirmLevel,
  effectiveLevel,
  nextParticipantId,
  normalizedWeights,
  setManualLevel,
  toRequirements,
  toRunParticipants,
} from './profiles.ts';
import type { ChallengeSkill, StoredParticipant } from './types.ts';

const person = (skills: StoredParticipant['skills'] = []): StoredParticipant => ({
  id: 'P001',
  name: 'مشارك',
  description: 'وصف',
  skills,
  analyzed: false,
});

const llamaProfile = {
  participantId: 'P001',
  source: 'llama' as const,
  skills: [
    { name: 'AI/ML', level: 4, confidence: 0.9, evidence: 'درّب نماذج' },
    { name: 'Frontend', level: 3, confidence: 0.4, evidence: 'ذكر React مرة' },
    { name: 'Backend', level: null, confidence: 0, evidence: null },
  ],
  needsConfirmation: ['Frontend', 'Backend'],
};

test('an uncertain AI guess stays unknown until the organizer confirms it', () => {
  const analyzed = applyProfile(person(), llamaProfile);
  const level = (p: StoredParticipant, name: string) => effectiveLevel(p.skills.find((s) => s.name === name) as StoredParticipant['skills'][number]);
  assert.equal(level(analyzed, 'AI/ML'), 4);
  assert.equal(level(analyzed, 'Frontend'), null);
  assert.equal(level(analyzed, 'Backend'), null);
  assert.equal(level(confirmLevel(analyzed, 'Frontend'), 'Frontend'), 3);
});

test('a manual correction wins, is labeled manual, and survives a new analysis', () => {
  const corrected = setManualLevel(applyProfile(person(), llamaProfile), 'AI/ML', 2);
  const reanalyzed = applyProfile(corrected, llamaProfile);
  const skill = reanalyzed.skills.find((s) => s.name === 'AI/ML');
  assert.equal(skill?.level, 2);
  assert.equal(skill?.source, 'manual');
  assert.equal(reanalyzed.skills.filter((s) => s.name === 'AI/ML').length, 1);
});

test('run participants carry null for unknown, and no evidence for values not in use', () => {
  const analyzed = applyProfile(person(), llamaProfile);
  const [run] = toRunParticipants([analyzed], ['AI/ML', 'Frontend', 'Research']);
  assert.deepEqual(run.skills, { 'AI/ML': 4, Frontend: null, Research: null });
  assert.equal(run.evidence['AI/ML'], 'درّب نماذج');
  assert.equal(run.evidence.Frontend, null);
});

test('skills removed from the challenge are not sent to the optimizer', () => {
  const [run] = toRunParticipants([person([{ ...blankSkill('Old'), level: 5 }])], ['AI/ML']);
  assert.deepEqual(run.skills, { 'AI/ML': null });
});

const skill = (over: Partial<ChallengeSkill>): ChallengeSkill => ({
  skill: 'AI/ML', weight: 50, minLevel: 3, minPerTeam: 0, hard: false, importance: null, reason: null, source: 'llama', ...over,
});

test('a requirement is hard only when ticked, and a ticked rule needs at least one member', () => {
  assert.deepEqual(toRequirements([skill({ minPerTeam: 2 })])[0], { skill: 'AI/ML', weight: 50, minLevel: 3, minPerTeam: 2, hard: false });
  assert.equal(toRequirements([skill({ hard: true })])[0].minPerTeam, 1);
});

test('weights are normalized to 100, including when they are all zero', () => {
  assert.deepEqual(normalizedWeights([{ weight: 30 }, { weight: 10 }]), [75, 25]);
  assert.deepEqual(normalizedWeights([{ weight: 0 }, { weight: 0 }]), [50, 50]);
});

test('participant ids are not reused after someone is removed, and fit the API format', () => {
  assert.equal(nextParticipantId([]), 'P001');
  assert.equal(nextParticipantId([{ id: 'P001' }, { id: 'P007' }]), 'P008');
});

test('team coverage counts only the weight of requirements with no gap', () => {
  const metrics = { teamId: 'T01', size: 4, skillStrength: {}, qualifying: {}, gaps: ['B'], experience: 2 };
  const reqs = [
    { skill: 'A', weight: 75, minLevel: 3, minPerTeam: 1, hard: false },
    { skill: 'B', weight: 25, minLevel: 3, minPerTeam: 1, hard: false },
  ];
  assert.equal(teamCoverage(metrics, reqs), 75);
});
