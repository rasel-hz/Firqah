import { handleAnalyzeParticipants } from '@/lib/api/handlers.ts';

export async function POST(request: Request) {
  return handleAnalyzeParticipants(request);
}
