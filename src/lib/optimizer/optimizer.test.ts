import assert from 'node:assert/strict';
import { test } from 'node:test';

import { computeCapacities } from './capacity.ts';
import { optimizeTeams } from './engine.ts';
import { computeScore, buildIndex, normalizeRequirements, validateAssignment } from './scoring.ts';
import type { Participant, SkillRequirement } from './types.ts';
import {
  balancedParticipants,
  imbalancedParticipants,
  scarceAiParticipants,
} from '../sample/participants.ts';

const SOFT_REQS: SkillRequirement[] = [
  { skill: 'AI/ML', weight: 40, minLevel: 3, minPerTeam: 1, hard: false },
  { skill: 'Frontend', weight: 30, minLevel: 3, minPerTeam: 1, hard: false },
  { skill: 'UI/UX', weight: 15, minLevel: 3, minPerTeam: 0, hard: false },
  { skill: 'Presentation', weight: 15, minLevel: 3, minPerTeam: 0, hard: false },
];

const withHard = (skill: string, minLevel: number, minPerTeam = 1): SkillRequirement[] =>
  SOFT_REQS.map((r) => (r.skill === skill ? { ...r, minLevel, minPerTeam, hard: true } : r));

test('capacities: 24/6 gives 4 each, 23/5 gives 5,5,5,4,4', () => {
  assert.deepEqual(computeCapacities(24, 6), [4, 4, 4, 4, 4, 4]);
  assert.deepEqual(computeCapacities(23, 5), [5, 5, 5, 4, 4]);
  assert.throws(() => computeCapacities(3, 5));
  assert.throws(() => computeCapacities(10, 0));
});

test('every participant is assigned exactly once and sizes match capacities', () => {
  const participants = balancedParticipants();
  const result = optimizeTeams({ participants, requirements: SOFT_REQS, teamCount: 6, seed: 7 });
  assert.equal(result.status, 'ok');

  const ids = result.teams.flatMap((t) => t.memberIds);
  assert.equal(ids.length, participants.length);
  assert.equal(new Set(ids).size, participants.length);
  assert.deepEqual(
    result.teams.map((t) => t.memberIds.length),
    [4, 4, 4, 4, 4, 4],
  );
  assert.equal(result.validation.valid, true);
});

test('uneven split (23 participants, 5 teams) respects 5,5,5,4,4', () => {
  const participants = balancedParticipants().slice(0, 23);
  const result = optimizeTeams({ participants, requirements: SOFT_REQS, teamCount: 5, seed: 3 });
  assert.equal(result.status, 'ok');
  assert.deepEqual(
    result.teams.map((t) => t.memberIds.length),
    [5, 5, 5, 4, 4],
  );
});

test('hard constraint: AI/ML 3+ in every team is enforced', () => {
  const participants = balancedParticipants();
  const reqs = withHard('AI/ML', 3);
  const result = optimizeTeams({ participants, requirements: reqs, teamCount: 6, seed: 11 });
  assert.equal(result.status, 'ok');
  assert.equal(result.score?.hardViolations, 0);
  const index = buildIndex(participants);
  for (const team of result.teams) {
    const strong = team.memberIds.filter((id) => ((index.get(id) as Participant).skills['AI/ML'] as number) >= 3);
    assert.ok(strong.length >= 1, `team ${team.id} has no AI/ML 3+ member`);
  }
});

test('scenario C: impossible constraint is reported, not faked', () => {
  const result = optimizeTeams({
    participants: scarceAiParticipants(),
    requirements: withHard('AI/ML', 4),
    teamCount: 6,
    seed: 5,
  });
  assert.equal(result.status, 'infeasible');
  assert.equal(result.score, null);
  assert.equal(result.teams.length, 0);
  assert.ok(result.reasons.some((r) => r.includes('AI/ML') && r.includes('6') && r.includes('3')));
});

test('scenario B: imbalanced pool still yields a valid result with honest gaps', () => {
  const result = optimizeTeams({
    participants: imbalancedParticipants(),
    requirements: SOFT_REQS,
    teamCount: 6,
    seed: 9,
  });
  assert.equal(result.status, 'ok');
  assert.equal(result.validation.valid, true);
  // Only 2 people have AI/ML 3+ in the pool, so at most 2 teams can be covered.
  const ai = result.score?.perRequirement.find((r) => r.skill === 'AI/ML');
  assert.ok(ai && ai.teamsSatisfied <= 2, 'coverage must not claim more teams than qualifying people');
  const gapTeams = result.teamMetrics.filter((m) => m.gaps.includes('AI/ML')).length;
  assert.ok(gapTeams >= 4, 'remaining AI/ML gaps must be visible in team metrics');
});

test('same seed gives the same result', () => {
  const participants = balancedParticipants();
  const a = optimizeTeams({ participants, requirements: SOFT_REQS, teamCount: 6, seed: 42 });
  const b = optimizeTeams({ participants, requirements: SOFT_REQS, teamCount: 6, seed: 42 });
  assert.deepEqual(a.teams, b.teams);
  assert.deepEqual(a.score, b.score);
  assert.deepEqual(a.baseline, b.baseline);
});

test('scores are bounded 0-100 and optimized beats the random baseline', () => {
  const result = optimizeTeams({
    participants: balancedParticipants(),
    requirements: SOFT_REQS,
    teamCount: 6,
    seed: 1,
  });
  assert.ok(result.score && result.baseline);
  for (const v of [result.score.overall, result.score.coverage, result.score.balance, result.score.experience]) {
    assert.ok(v >= 0 && v <= 100);
  }
  assert.ok(
    result.score.overall >= result.baseline.meanOverall,
    `optimized ${result.score.overall} should be >= random mean ${result.baseline.meanOverall}`,
  );
  console.log(
    `[measured] scenario A: optimized=${result.score.overall} (coverage ${result.score.coverage}, balance ${result.score.balance}, experience ${result.score.experience}); ` +
      `random baseline mean=${result.baseline.meanOverall}, max=${result.baseline.maxOverall} over ${result.baseline.runs} runs`,
  );
});

test('unknown (null) levels are not treated as confirmed zero or as qualifying', () => {
  const reqs = normalizeRequirements([{ skill: 'AI/ML', weight: 100, minLevel: 3, minPerTeam: 1, hard: false }]);
  const people: Participant[] = [
    { id: 'A', name: 'أ', skills: { 'AI/ML': 4 } },
    { id: 'B', name: 'ب', skills: { 'AI/ML': null } },
    { id: 'C', name: 'ج', skills: {} },
    { id: 'D', name: 'د', skills: { 'AI/ML': 0 } },
  ];
  const index = buildIndex(people);
  const score = computeScore(index, [['A', 'B'], ['C', 'D']], reqs);
  // Only team 1 has a confirmed 3+ member; null/missing never qualify.
  assert.equal(score.perRequirement[0].teamsSatisfied, 1);
  // B (null) and C (missing) are unknown; D is a confirmed 0 -> 2 of 4 cells unknown.
  assert.equal(score.unknownRatio, 0.5);
});

test('validateAssignment catches duplicates, missing people and wrong sizes', () => {
  const people = balancedParticipants().slice(0, 4);
  const reqs = normalizeRequirements(SOFT_REQS);
  const bad = validateAssignment(people, [['P01', 'P01'], ['P02']], [2, 2], reqs);
  assert.equal(bad.valid, false);
  assert.ok(bad.issues.length >= 3);
});
