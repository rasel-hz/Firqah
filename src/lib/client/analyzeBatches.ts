// Sends participants to the API in small batches, so each request stays short on any host and
// finished batches are kept even if a later one fails.
import type { ReconcileResult } from '../llama/reconcile.ts';
import type { ApiResult } from './api.ts';

export const BATCH_SIZE = 5;
const CONCURRENCY = 3;

export type BatchReply = Pick<ReconcileResult, 'profiles' | 'missingIds'> & { warning: string | null };

export interface BatchSummary {
  /** Set only when nothing can work, such as missing configuration. */
  fatal: { code: string; message: string } | null;
  /** People with no result: a failed batch, or left out by the model. They can be retried or entered manually. */
  missingIds: string[];
  /** The last failure message, shown beside missingIds. */
  warning: string | null;
}

const FATAL_CODES = new Set(['missing_config', 'bad_request']);

export async function analyzeInBatches<P extends { id: string }>(
  participants: P[],
  send: (batch: P[]) => Promise<ApiResult<BatchReply>>,
  onBatchDone: (reply: BatchReply) => void,
): Promise<BatchSummary> {
  const batches: P[][] = [];
  for (let start = 0; start < participants.length; start += BATCH_SIZE) {
    batches.push(participants.slice(start, start + BATCH_SIZE));
  }

  const summary: BatchSummary = { fatal: null, missingIds: [], warning: null };
  let next = 0;
  let succeeded = 0;

  const worker = async () => {
    while (next < batches.length && !summary.fatal) {
      const batch = batches[next++];
      let result = await send(batch);
      // Provider failures are often brief, so a failed batch gets one more try before it is reported.
      if (!result.ok && !FATAL_CODES.has(result.code)) result = await send(batch);
      if (result.ok) {
        succeeded++;
        summary.missingIds.push(...result.data.missingIds);
        if (result.data.warning) summary.warning = result.data.warning;
        onBatchDone(result.data);
      } else if (FATAL_CODES.has(result.code)) {
        summary.fatal = { code: result.code, message: result.message };
      } else {
        summary.missingIds.push(...batch.map((p) => p.id));
        summary.warning = result.message;
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // When every batch fails there is nothing partial to show, so it is reported as a plain error.
  if (!summary.fatal && succeeded === 0 && summary.warning) {
    summary.fatal = { code: 'all_failed', message: summary.warning };
  }
  const order = new Map(participants.map((p, i) => [p.id, i]));
  summary.missingIds.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
  return summary;
}
