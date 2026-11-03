// What the team board shows. Pure, and read only from the optimizer's result: nothing here decides a team.
import { skillStatus } from '../llama/review.ts';
import type { SkillStatus } from '../llama/review.ts';
import type { SkillRequirement, TeamMetrics } from '../optimizer/types.ts';

export interface BoardPerson {
  id: string;
  name: string;
  skills: Record<string, number | null>;
}

export interface BoardMember extends BoardPerson {
  /** Requirement skills this person meets with a confirmed level. */
  qualified: string[];
}

export interface BoardTeam {
  id: string;
  members: BoardMember[];
  status: { skill: string; status: SkillStatus }[];
}

export function buildBoard(
  teams: { id: string; memberIds: string[] }[],
  metrics: TeamMetrics[],
  participants: BoardPerson[],
  requirements: SkillRequirement[],
): BoardTeam[] {
  const byId = new Map(participants.map((p) => [p.id, p]));
  return teams.map((team, i) => {
    const people = team.memberIds.flatMap((id) => {
      const person = byId.get(id);
      return person ? [person] : [];
    });
    const gaps = metrics[i]?.gaps ?? [];
    return {
      id: team.id,
      members: people.map((person) => ({
        ...person,
        qualified: requirements
          .filter((r) => {
            const level = person.skills[r.skill];
            return typeof level === 'number' && level >= r.minLevel;
          })
          .map((r) => r.skill),
      })),
      status: requirements.map((r) => ({
        skill: r.skill,
        status: skillStatus(gaps, r.skill, people.map((p) => p.skills[r.skill] ?? null)),
      })),
    };
  });
}

/** The first letter of the name, for a person's seat on the board. */
export function initialOf(name: string): string {
  return Array.from(name.trim())[0] ?? '?';
}

/** The one sentence that says how ready the teams are, counted from the board. */
export function boardFinding(board: BoardTeam[]): string {
  const clear = board.filter((t) => t.status.every((s) => s.status === 'met')).length;
  const unconfirmed = board.filter((t) => t.status.some((s) => s.status === 'unconfirmed')).length;
  const missing = board.filter((t) => t.status.some((s) => s.status === 'missing')).length;
  const parts = [`${clear} من ${board.length} فرق مكتملة المهارات`];
  if (unconfirmed > 0) parts.push(`${unconfirmed} فيها مهارات غير مؤكدة`);
  if (missing > 0) parts.push(`${missing} فيها نقص فعلي`);
  return parts.join('، ');
}
