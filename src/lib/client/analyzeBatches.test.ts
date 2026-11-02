import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ApiResult } from './api.ts';
import { analyzeInBatches } from './analyzeBatches.ts';
import type { BatchReply } from './analyzeBatches.ts';

const people = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `P${i + 1}` }));

const ok = (batch: { id: string }[]): ApiResult<BatchReply> => ({
  ok: true,
  data: {
    profiles: batch.map((p) => ({ participantId: p.id, skills: [], needsConfirmation: [], source: 'llama' as const })),
    missingIds: [],
    warning: null,
  },
});

test('no request carries more than 5 people, and everyone is sent exactly once', async () => {
  const sent: string[][] = [];
  const summary = await analyzeInBatches(people(12), async (batch) => { sent.push(batch.map((p) => p.id)); return ok(batch); }, () => {});
  assert.ok(sent.every((batch) => batch.length <= 5));
  assert.equal(sent.flat().length, 12);
  assert.equal(new Set(sent.flat()).size, 12);
  assert.deepEqual(summary, { fatal: null, missingIds: [], warning: null });
});

test('finished batches are delivered, and a failed batch is reported as missing, in order', async () => {
  const done: string[] = [];
  const summary = await analyzeInBatches(
    people(12),
    async (batch) => (batch[0].id === 'P6' ? { ok: false, code: 'timeout', message: 'انتهت المهلة' } : ok(batch)),
    (reply) => done.push(...reply.profiles.map((p) => p.participantId)),
  );
  assert.equal(done.length, 7);
  assert.deepEqual(summary.missingIds, ['P6', 'P7', 'P8', 'P9', 'P10']);
  assert.equal(summary.warning, 'انتهت المهلة');
  assert.equal(summary.fatal, null);
});

test('missing configuration stops further requests', async () => {
  let calls = 0;
  const summary = await analyzeInBatches(
    people(30),
    async () => { calls++; return { ok: false, code: 'missing_config', message: 'غير مهيأ' }; },
    () => {},
  );
  assert.equal(summary.fatal?.code, 'missing_config');
  assert.ok(calls <= 3);
});

test('when every batch fails it is a plain error, with no invented results', async () => {
  const done: unknown[] = [];
  const summary = await analyzeInBatches(
    people(7),
    async () => ({ ok: false, code: 'network', message: 'لا اتصال' }),
    (reply) => done.push(reply),
  );
  assert.equal(summary.fatal?.message, 'لا اتصال');
  assert.equal(done.length, 0);
});
