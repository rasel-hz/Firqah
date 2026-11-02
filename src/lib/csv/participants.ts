// Reads participants from CSV or pasted text. Pure and dependency-free, so it can run in the browser and in tests.

export interface ImportRow {
  name: string;
  description: string;
}

export interface ImportIssue {
  /** 1-based line in the source text. 0 means the problem is with the file as a whole. */
  line: number;
  message: string;
}

export interface ImportResult {
  rows: ImportRow[];
  issues: ImportIssue[];
}

export const MAX_IMPORT_ROWS = 300;

const NAME_HEADERS = new Set(['name', 'الاسم', 'اسم']);
const DESCRIPTION_HEADERS = new Set(['description', 'الوصف', 'وصف']);

export const TEMPLATE_CSV = '﻿name,description\nاسم المشارك,"نبذة قصيرة عن مهاراته وخبراته"\n';

/** RFC 4180 rows. Each row keeps the line it started on, for error messages. */
export function parseCsv(text: string): { line: number; cells: string[] }[] {
  const source = text.replace(/^﻿/, '');
  const rows: { line: number; cells: string[] }[] = [];
  let cells: string[] = [];
  let cell = '';
  let quoted = false;
  let line = 1;
  let rowLine = 1;

  const endRow = () => {
    cells.push(cell);
    if (cells.some((c) => c.trim() !== '')) rows.push({ line: rowLine, cells });
    cells = [];
    cell = '';
  };

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        if (ch === '\n') line++;
        cell += ch;
      }
    } else if (ch === '"' && cell === '') {
      quoted = true;
    } else if (ch === ',') {
      cells.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && source[i + 1] === '\n') i++;
      endRow();
      line++;
      rowLine = line;
    } else {
      cell += ch;
    }
  }
  endRow();
  return rows;
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Drops empty and repeated rows and reports each one, instead of importing them quietly. */
function validateRows(candidates: { line: number; name: string; description: string }[]): ImportResult {
  const rows: ImportRow[] = [];
  const issues: ImportIssue[] = [];
  const seen = new Set<string>();

  for (const { line, name, description } of candidates) {
    const cleanName = name.trim();
    const cleanDescription = description.trim();
    if (cleanName === '') {
      issues.push({ line, message: 'الاسم فارغ.' });
    } else if (cleanDescription === '') {
      issues.push({ line, message: `الوصف فارغ للمشارك «${cleanName}».` });
    } else if (seen.has(normalizeName(cleanName))) {
      issues.push({ line, message: `الاسم «${cleanName}» مكرر.` });
    } else if (rows.length >= MAX_IMPORT_ROWS) {
      issues.push({ line: 0, message: `الحد الأقصى ${MAX_IMPORT_ROWS} مشارك، وتم تجاهل الصفوف الزائدة.` });
      break;
    } else {
      seen.add(normalizeName(cleanName));
      rows.push({ name: cleanName, description: cleanDescription });
    }
  }
  return { rows, issues };
}

export function parseParticipantsCsv(text: string): ImportResult {
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], issues: [{ line: 0, message: 'الملف فارغ.' }] };

  const header = table[0].cells.map((c) => c.trim().toLowerCase());
  const nameColumn = header.findIndex((h) => NAME_HEADERS.has(h));
  const descriptionColumn = header.findIndex((h) => DESCRIPTION_HEADERS.has(h));
  if (nameColumn === -1 || descriptionColumn === -1) {
    return {
      rows: [],
      issues: [{ line: 1, message: 'يجب أن يحتوي الصف الأول على العمودين name و description.' }],
    };
  }
  if (table.length === 1) return { rows: [], issues: [{ line: 0, message: 'لا توجد صفوف بعد العناوين.' }] };

  return validateRows(
    table.slice(1).map(({ line, cells }) => ({
      line,
      name: cells[nameColumn] ?? '',
      description: cells[descriptionColumn] ?? '',
    })),
  );
}

/** Pasted text: one participant per line, written as "الاسم: الوصف". */
export function parseParticipantsText(text: string): ImportResult {
  const candidates: { line: number; name: string; description: string }[] = [];
  const issues: ImportIssue[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    if (raw.trim() === '') return;
    const colon = raw.search(/[:：]/);
    if (colon === -1) {
      issues.push({ line: i + 1, message: 'اكتب السطر بصيغة «الاسم: الوصف».' });
      return;
    }
    candidates.push({ line: i + 1, name: raw.slice(0, colon), description: raw.slice(colon + 1) });
  });
  const result = validateRows(candidates);
  return { rows: result.rows, issues: [...issues, ...result.issues].sort((a, b) => a.line - b.line) };
}
