import assert from 'node:assert/strict';
import { test } from 'node:test';
import { boardFinding, buildBoard, initialOf } from './board.ts';

const requirements = [
  { skill: 'AI/ML', weight: 50, minLevel: 3, minPerTeam: 1, hard: false },
  { skill: 'UI/UX', weight: 50, minLevel: 3, minPerTeam: 1, hard: false },
];
const participants = [
  { id: 'P1', name: 'نورة الحربي', skills: { 'AI/ML': 5, 'UI/UX': null } },
  { id: 'P2', name: 'فهد', skills: { 'AI/ML': 1, 'UI/UX': 1 } },
];
const metric = (teamId: string, gaps: string[]) => ({ teamId, size: 1, skillStrength: {}, qualifying: {}, gaps, experience: 0 });

test('only confirmed levels at the minimum qualify, and an unknown level never does', () => {
  const [team] = buildBoard([{ id: 'T01', memberIds: ['P1'] }], [metric('T01', ['UI/UX'])], participants, requirements);
  assert.deepEqual(team.members[0].qualified, ['AI/ML']);
});

test('a gap with unknown levels is unconfirmed, and with known levels it is missing', () => {
  const board = buildBoard(
    [{ id: 'T01', memberIds: ['P1'] }, { id: 'T02', memberIds: ['P2'] }],
    [metric('T01', ['UI/UX']), metric('T02', ['AI/ML', 'UI/UX'])],
    participants,
    requirements,
  );
  assert.deepEqual(board[0].status, [{ skill: 'AI/ML', status: 'met' }, { skill: 'UI/UX', status: 'unconfirmed' }]);
  assert.deepEqual(board[1].status.map((s) => s.status), ['missing', 'missing']);
});

test('the finding is counted from the board', () => {
  const board = buildBoard(
    [{ id: 'T01', memberIds: ['P1'] }, { id: 'T02', memberIds: ['P2'] }],
    [metric('T01', ['UI/UX']), metric('T02', ['AI/ML'])],
    participants,
    requirements,
  );
  assert.equal(boardFinding(board), '0 من 2 فرق مكتملة المهارات، 1 فيها مهارات غير مؤكدة، 1 فيها نقص فعلي');
});

test('a person id the optimizer returned but the input lacks is skipped, not invented', () => {
  const [team] = buildBoard([{ id: 'T01', memberIds: ['GHOST'] }], [metric('T01', [])], participants, requirements);
  assert.equal(team.members.length, 0);
});

test('the initial handles Arabic, surrounding spaces and an empty name', () => {
  assert.equal(initialOf('  نورة'), 'ن');
  assert.equal(initialOf(''), '?');
});
