import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LlamaError, callLlamaJson, extractJson, readLlamaConfig } from './client.ts';
import type { LlamaConfig } from './client.ts';
import { reconcileProfiles } from './reconcile.ts';

const config: LlamaConfig = { baseUrl: 'https://example.test/v1', apiKey: 'k', model: 'm', jsonMode: true };

function reply(content: string, status = 200): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status });
}

function sequence(...responses: (Response | Error)[]): typeof fetch {
  let i = 0;
  return (async () => {
    const next = responses[Math.min(i++, responses.length - 1)];
    if (next instanceof Error) throw next;
    return next;
  }) as typeof fetch;
}

const validate = (d: unknown): { ok: number } => {
  const value = d as { ok?: unknown };
  if (typeof value?.ok !== 'number') throw new Error('ok must be a number');
  return { ok: value.ok };
};

test('missing configuration gives a clear error, never a fake answer', () => {
  assert.throws(
    () => readLlamaConfig({}),
    (e: unknown) => e instanceof LlamaError && e.code === 'missing_config',
  );
});

test('extractJson tolerates code fences and surrounding prose', () => {
  assert.deepEqual(extractJson('Here:\n```json\n{"ok": 1}\n```\nDone'), { ok: 1 });
  assert.deepEqual(extractJson('{"ok": 2}'), { ok: 2 });
  assert.throws(() => extractJson('no json here'));
});

test('valid reply passes straight through', async () => {
  const result = await callLlamaJson({
    system: 's', user: 'u', validate, config, fetchImpl: sequence(reply('{"ok": 7}')),
  });
  assert.deepEqual(result, { ok: 7 });
});

test('malformed reply triggers exactly one repair attempt', async () => {
  let calls = 0;
  const fetchImpl = (async () => {
    calls++;
    return calls === 1 ? reply('not json at all') : reply('{"ok": 3}');
  }) as typeof fetch;
  const result = await callLlamaJson({ system: 's', user: 'u', validate, config, fetchImpl });
  assert.deepEqual(result, { ok: 3 });
  assert.equal(calls, 2);
});

test('two bad replies fail with invalid_output (no endless retry)', async () => {
  let calls = 0;
  const fetchImpl = (async () => {
    calls++;
    return reply('{"ok": "nope"}');
  }) as typeof fetch;
  await assert.rejects(
    callLlamaJson({ system: 's', user: 'u', validate, config, fetchImpl }),
    (e: unknown) => e instanceof LlamaError && e.code === 'invalid_output',
  );
  assert.equal(calls, 2);
});

test('rate limit, provider error, network failure and timeout are classified', async () => {
  const run = (fetchImpl: typeof fetch) =>
    callLlamaJson({ system: 's', user: 'u', validate, config, fetchImpl, timeoutMs: 50 });

  await assert.rejects(run(sequence(new Response('', { status: 429 }))), (e: unknown) => (e as LlamaError).code === 'rate_limited');
  await assert.rejects(run(sequence(new Response('boom', { status: 500 }))), (e: unknown) => (e as LlamaError).code === 'provider_error');
  await assert.rejects(run(sequence(new Error('socket hang up'))), (e: unknown) => (e as LlamaError).code === 'network');

  const abortError = new Error('aborted');
  abortError.name = 'AbortError';
  await assert.rejects(run(sequence(abortError)), (e: unknown) => (e as LlamaError).code === 'timeout');
});

test('user-facing messages never include internal detail', async () => {
  try {
    await callLlamaJson({
      system: 's', user: 'u', validate, config,
      fetchImpl: sequence(new Response('secret-internal-body', { status: 500 })),
    });
    assert.fail('should have thrown');
  } catch (e) {
    assert.ok(e instanceof LlamaError);
    assert.ok(!e.userMessage.includes('secret-internal-body'));
  }
});

test('reconcile: validates ids, drops unapproved skills, flags unknown and unsupported levels', () => {
  const result = reconcileProfiles(['P1', 'P2', 'P3'], ['AI/ML', 'Frontend'], [
    {
      participant_id: 'P1',
      skills: [
        { name: 'frontend', level: 4, confidence: 0.9, evidence: 'built two React projects' },
        { name: 'AI/ML', level: 5, confidence: 0.9, evidence: null }, // level without evidence
        { name: 'Cooking', level: 5, confidence: 1, evidence: 'x' }, // not an approved skill
      ],
      needs_confirmation: [],
    },
    { participant_id: 'P2', skills: [{ name: 'AI/ML', level: 9, confidence: 0.8, evidence: 'ok' }], needs_confirmation: [] },
    { participant_id: 'GHOST', skills: [], needs_confirmation: [] },
  ]);

  assert.deepEqual(result.missingIds, ['P3']);
  assert.deepEqual(result.unexpectedIds, ['GHOST']);

  const p1 = result.profiles.find((p) => p.participantId === 'P1');
  assert.ok(p1);
  assert.equal(p1.skills.find((s) => s.name === 'Frontend')?.level, 4);
  assert.equal(p1.skills.find((s) => s.name === 'AI/ML')?.level, null); // unsupported guess not accepted
  assert.ok(p1.needsConfirmation.includes('AI/ML'));
  assert.ok(!p1.skills.some((s) => s.name === 'Cooking'));

  const p2 = result.profiles.find((p) => p.participantId === 'P2');
  assert.equal(p2?.skills.find((s) => s.name === 'AI/ML')?.level, 5); // clamped to 0..5
  assert.ok(p2?.needsConfirmation.includes('Frontend')); // never mentioned = unknown
});
