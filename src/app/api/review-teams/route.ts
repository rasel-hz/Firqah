import { handleReviewTeams } from '@/lib/api/handlers.ts';

export async function POST(request: Request) {
  return handleReviewTeams(request);
}
