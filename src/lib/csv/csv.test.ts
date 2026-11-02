import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { buildTeamsCsv } from './exportTeams.ts';
import { TEMPLATE_CSV, parseCsv, parseParticipantsCsv, parseParticipantsText } from './participants.ts';

test('parses a BOM, quotes, commas, escaped quotes and new lines inside a cell', () => {
  const rows = parseCsv('﻿name,description\r\n"نورة","تحب ""React""، و,تصمم\nأيضًا"\r\nخالد,باك إند\n');
  assert.equal(rows.length, 3);
  assert.equal(rows[1].cells[1], 'تحب "React"، و,تصمم\nأيضًا');
  assert.equal(rows[2].line, 4);
});

test('accepts English and Arabic headers in any order', () => {
  assert.deepEqual(parseParticipantsCsv('description,name\nوصف,نورة').rows, [{ name: 'نورة', description: 'وصف' }]);
  assert.deepEqual(parseParticipantsCsv('الاسم,الوصف\nنورة,وصف').rows, [{ name: 'نورة', description: 'وصف' }]);
});

test('missing columns are reported and nothing is imported', () => {
  const result = parseParticipantsCsv('name,age\nنورة,20');
  assert.equal(result.rows.length, 0);
  assert.equal(result.issues[0].line, 1);
});

test('empty files and header-only files are reported', () => {
  assert.equal(parseParticipantsCsv('').issues.length, 1);
  assert.equal(parseParticipantsCsv('name,description\n').issues.length, 1);
});

test('empty names, empty descriptions and duplicates are reported with their line', () => {
  const result = parseParticipantsCsv('name,description\n,وصف\nنورة,\nخالد,وصف\n  خالد ,وصف آخر\nسارة,وصف');
  assert.deepEqual(result.rows.map((r) => r.name), ['خالد', 'سارة']);
  assert.deepEqual(result.issues.map((i) => i.line), [2, 3, 5]);
});

test('pasted text uses one "name: description" per line and reports bad lines', () => {
  const result = parseParticipantsText('نورة: تعمل على النماذج: وتحللها\n\nسطر بلا فاصل\nخالد: باك إند');
  assert.deepEqual(result.rows, [
    { name: 'نورة', description: 'تعمل على النماذج: وتحللها' },
    { name: 'خالد', description: 'باك إند' },
  ]);
  assert.deepEqual(result.issues.map((i) => i.line), [3]);
});

test('the template and the synthetic sample are valid imports', () => {
  assert.equal(parseParticipantsCsv(TEMPLATE_CSV).rows.length, 1);
  const sample = parseParticipantsCsv(readFileSync(new URL('../../../public/firqah-sample-participants.csv', import.meta.url), 'utf8'));
  assert.deepEqual(sample.issues, []);
  assert.equal(sample.rows.length, 24);
});

test('export writes unknown as unknown, never 0, and neutralizes formulas', () => {
  const csv = buildTeamsCsv({
    teams: [{ id: 'T01', memberIds: ['P1', 'P2'] }],
    participants: [
      { id: 'P1', name: '=HYPERLINK("x")', skills: { A: null } },
      { id: 'P2', name: 'نورة', skills: { A: 0 } },
    ],
    skills: ['A'],
  });
  const lines = csv.replace('﻿', '').trim().split('\n');
  assert.equal(lines[1], `T01,"'=HYPERLINK(""x"")",مجهول`);
  assert.equal(lines[2], 'T01,نورة,0');
});
