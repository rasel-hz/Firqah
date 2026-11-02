import { handleGenerateTeams } from '@/lib/api/handlers.ts';

export async function POST(request: Request) {
  return handleGenerateTeams(request);
}
