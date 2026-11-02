import { handleAnalyzeChallenge } from '@/lib/api/handlers.ts';

export async function POST(request: Request) {
  return handleAnalyzeChallenge(request);
}
