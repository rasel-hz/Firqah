'use client';

import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { Download, FileUp, UserPlus } from 'lucide-react';
import { downloadText } from '@/lib/client/api.ts';
import { TEMPLATE_CSV, parseParticipantsCsv, parseParticipantsText } from '@/lib/csv/participants.ts';
import type { ImportResult, ImportRow } from '@/lib/csv/participants.ts';
import { Button, Card, CardTitle, Field, Notice, SourceBadge, buttonClass, inputClass } from './ui.tsx';

const SAMPLE_URL = '/firqah-sample-participants.csv';

type Mode = 'csv' | 'paste' | 'manual';
const MODES: { key: Mode; label: string }[] = [
  { key: 'csv', label: 'ملف CSV' },
  { key: 'paste', label: 'لصق نص' },
  { key: 'manual', label: 'إدخال يدوي' },
];

export function ImportPanel({ existingNames, onImport }: { existingNames: string[]; onImport: (rows: ImportRow[]) => void }) {
  const [mode, setMode] = useState<Mode>('csv');
  const [pasted, setPasted] = useState('');
  const [manual, setManual] = useState<ImportRow>({ name: '', description: '' });
  const [preview, setPreview] = useState<(ImportResult & { synthetic: boolean }) | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const taken = new Set(existingNames.map((n) => n.trim().toLowerCase()));

  /** People already in this challenge are reported like any other duplicate. */
  function showPreview(result: ImportResult, synthetic = false) {
    const repeated = result.rows.filter((r) => taken.has(r.name.toLowerCase()));
    setPreview({
      synthetic,
      rows: result.rows.filter((r) => !taken.has(r.name.toLowerCase())),
      issues: [...result.issues, ...repeated.map((r) => ({ line: 0, message: `«${r.name}» موجود مسبقًا في هذا التحدي.` }))],
    });
  }

  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setFileError(null);
    try {
      showPreview(parseParticipantsCsv(await file.text()));
    } catch {
      setFileError('تعذّرت قراءة الملف.');
    }
  }

  async function loadSample() {
    setFileError(null);
    try {
      const response = await fetch(SAMPLE_URL);
      if (!response.ok) throw new Error(String(response.status));
      showPreview(parseParticipantsCsv(await response.text()), true);
    } catch {
      setFileError('تعذّر تحميل البيانات التجريبية.');
    }
  }

  function addManual() {
    const result = parseParticipantsText(`${manual.name.replace(/[:：]/g, ' ')}: ${manual.description}`);
    const name = result.rows[0]?.name;
    if (!name) return;
    if (taken.has(name.toLowerCase())) {
      setFileError(`«${name}» موجود مسبقًا في هذا التحدي.`);
      return;
    }
    setFileError(null);
    onImport(result.rows);
    setManual({ name: '', description: '' });
  }

  return (
    <Card className="space-y-4">
      <CardTitle>إضافة مشاركين</CardTitle>
      <div role="tablist" aria-label="طريقة الإضافة" className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <Button key={m.key} role="tab" aria-selected={mode === m.key} variant={mode === m.key ? 'secondary' : 'ghost'} onClick={() => { setMode(m.key); setPreview(null); setFileError(null); }}>
            {m.label}
          </Button>
        ))}
      </div>

      {mode === 'csv' ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">يجب أن يحتوي الملف على العمودين name و description.</p>
          <div className="flex flex-wrap gap-2">
            <label className={`${buttonClass()} cursor-pointer focus-within:outline-2 focus-within:outline-ink`}>
              <FileUp className="size-4" aria-hidden />
              اختيار ملف
              <input type="file" accept=".csv,text/csv" className="sr-only" onChange={readFile} />
            </label>
            <Button variant="secondary" onClick={() => downloadText('firqah-template.csv', TEMPLATE_CSV)}>
              <Download className="size-4" aria-hidden />
              تنزيل القالب
            </Button>
            <Button variant="secondary" onClick={loadSample}>تجربة 24 مشاركًا</Button>
            <a href={SAMPLE_URL} download className={buttonClass('ghost')}>
              <Download className="size-4" aria-hidden />
              تنزيل العينة
            </a>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <SourceBadge kind="synthetic" />
            العينة أشخاص خياليون لأغراض التجربة فقط.
          </div>
        </div>
      ) : null}

      {mode === 'paste' ? (
        <div className="space-y-3">
          <Field label="مشارك في كل سطر" hint="الصيغة: الاسم: الوصف">
            <textarea className={`${inputClass} min-h-32`} value={pasted} placeholder="نورة: أعمل على نماذج تعلم الآلة منذ سنتين" onChange={(e) => setPasted(e.target.value)} />
          </Field>
          <Button variant="secondary" disabled={!pasted.trim()} onClick={() => showPreview(parseParticipantsText(pasted))}>معاينة</Button>
        </div>
      ) : null}

      {mode === 'manual' ? (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); addManual(); }}>
          <Field label="الاسم">
            <input className={inputClass} maxLength={200} value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} />
          </Field>
          <Field label="الوصف">
            <textarea className={`${inputClass} min-h-20`} maxLength={5000} value={manual.description} onChange={(e) => setManual({ ...manual, description: e.target.value })} />
          </Field>
          <Button type="submit" variant="secondary" disabled={!manual.name.trim() || !manual.description.trim()}>
            <UserPlus className="size-4" aria-hidden />
            إضافة
          </Button>
        </form>
      ) : null}

      {fileError ? <Notice tone="error" title={fileError} /> : null}

      {preview ? (
        <div className="space-y-3 border-t border-line pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">معاينة: {preview.rows.length} صالح</h3>
            {preview.synthetic ? <SourceBadge kind="synthetic" /> : null}
          </div>
          {preview.issues.length > 0 ? (
            <Notice tone="warning" title={`${preview.issues.length} صف لن يُستورد`}>
              <ul className="max-h-40 list-disc space-y-1 overflow-y-auto ps-4">
                {preview.issues.map((issue, i) => (
                  <li key={i}>{issue.line > 0 ? `سطر ${issue.line}: ` : ''}{issue.message}</li>
                ))}
              </ul>
            </Notice>
          ) : null}
          {preview.rows.length > 0 ? (
            <div className="max-h-64 overflow-auto rounded-lg border border-line">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-raised text-start text-muted">
                  <tr>
                    <th className="p-2 text-start font-medium">الاسم</th>
                    <th className="p-2 text-start font-medium">الوصف</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={row.name} className="border-t border-line align-top">
                      <td className="p-2 whitespace-nowrap">{row.name}</td>
                      <td className="p-2 text-muted">{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button disabled={preview.rows.length === 0} onClick={() => { onImport(preview.rows); setPreview(null); setPasted(''); }}>
              استيراد {preview.rows.length}
            </Button>
            <Button variant="ghost" onClick={() => setPreview(null)}>إلغاء</Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
