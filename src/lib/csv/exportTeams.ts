// Builds the teams CSV. Skill levels are written as confirmed; unknown stays "مجهول", never 0.

export interface ExportInput {
  teams: { id: string; memberIds: string[] }[];
  participants: { id: string; name: string; skills: Record<string, number | null> }[];
  skills: string[];
}

/** Spreadsheet apps run cells that start with these characters as formulas, so they are neutralized. */
function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function buildTeamsCsv({ teams, participants, skills }: ExportInput): string {
  const byId = new Map(participants.map((p) => [p.id, p]));
  const lines = [['الفريق', 'الاسم', ...skills].map(csvCell).join(',')];
  for (const team of teams) {
    for (const id of team.memberIds) {
      const person = byId.get(id);
      if (!person) continue;
      const levels = skills.map((s) => {
        const level = person.skills[s];
        return typeof level === 'number' ? String(level) : 'مجهول';
      });
      lines.push([team.id, person.name, ...levels].map(csvCell).join(','));
    }
  }
  // The BOM makes Excel read the Arabic text correctly.
  return `﻿${lines.join('\n')}\n`;
}
