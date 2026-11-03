'use client';

import { useState } from 'react';
import { AlertTriangle, Check, Pencil, Trash2 } from 'lucide-react';
import { LOW_CONFIDENCE } from '@/lib/llama/reconcile.ts';
import { alignSkills, confirmLevel, effectiveLevel, isPendingConfirmation, setManualLevel } from '@/lib/state/profiles.ts';
import type { ProfileSkill, StoredParticipant } from '@/lib/state/types.ts';
import { Button, Card, Field, LevelSelect, SourceBadge, inputClass, levelLabel } from './ui.tsx';

function chipStyle(skill: ProfileSkill): string {
  if (isPendingConfirmation(skill)) return 'border-warn bg-canvas';
  if (effectiveLevel(skill) === null) return 'border-control bg-canvas text-muted';
  return 'border-transparent bg-raised';
}

function SkillDetail({ skill, participant, onChange }: { skill: ProfileSkill; participant: StoredParticipant; onChange: (p: StoredParticipant) => void }) {
  return (
    <div className="swap space-y-3 rounded-2xl bg-raised p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium ltr-value">{skill.name}</span>
        {skill.source ? <SourceBadge kind={skill.source} /> : <span className="text-xs text-muted">لا توجد قيمة بعد</span>}
        {skill.confirmed && skill.source === 'llama' ? <span className="text-xs text-good">أكّدها المنظم</span> : null}
      </div>
      {skill.source === 'llama' ? (
        <div className="space-y-1">
          <p>
            <span className="text-muted">الدليل: </span>
            {skill.evidence ?? 'لا يوجد دليل في الوصف'}
          </p>
          <p className={skill.confidence < LOW_CONFIDENCE ? 'text-warn' : 'text-muted'}>
            الثقة: <span className="ltr-value">{Math.round(skill.confidence * 100)}%</span>
          </p>
        </div>
      ) : null}
      {isPendingConfirmation(skill) ? (
        <p className="text-warn">
          اقترح Llama «{levelLabel(skill.level)}» بثقة منخفضة، وسيُعامل كمجهول حتى تؤكده أو تصححه.
        </p>
      ) : null}
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-44">
          <Field label="المستوى">
            <LevelSelect label={`مستوى ${skill.name}`} value={skill.level} onChange={(level) => onChange(setManualLevel(participant, skill.name, level))} />
          </Field>
        </div>
        {isPendingConfirmation(skill) ? (
          <Button variant="secondary" onClick={() => onChange(confirmLevel(participant, skill.name))}>
            <Check className="size-4" aria-hidden />
            تأكيد الاقتراح
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function ParticipantCard({
  participant,
  skillNames,
  onChange,
  onRemove,
}: {
  participant: StoredParticipant;
  skillNames: string[];
  onChange: (next: StoredParticipant) => void;
  onRemove: () => void;
}) {
  const [openSkill, setOpenSkill] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: participant.name, description: participant.description });
  const skills = alignSkills(participant, skillNames);
  const open = skills.find((s) => s.name === openSkill);
  const manualOnly = !participant.analyzed && skills.some((s) => s.source === 'manual');

  function saveEdit() {
    const description = draft.description.trim();
    const changed = description !== participant.description;
    // A changed description makes the old analysis out of date, so it can be analyzed again.
    onChange({ ...participant, name: draft.name.trim(), description, analyzed: changed ? false : participant.analyzed });
    setEditing(false);
  }

  return (
    <Card className="arrive space-y-3 !bg-canvas">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-2">
              <input aria-label="الاسم" className={inputClass} maxLength={200} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <textarea aria-label="الوصف" className={`${inputClass} min-h-20`} maxLength={5000} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              <div className="flex gap-2">
                <Button variant="secondary" disabled={!draft.name.trim() || !draft.description.trim()} onClick={saveEdit}>حفظ</Button>
                <Button variant="ghost" onClick={() => { setDraft({ name: participant.name, description: participant.description }); setEditing(false); }}>إلغاء</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium break-words">{participant.name}</p>
                {participant.analyzed ? <SourceBadge kind="llama" /> : manualOnly ? <SourceBadge kind="manual" /> : <span className="text-xs text-muted">لم يُحلَّل بعد</span>}
              </div>
              <p className="mt-1 text-sm text-muted break-words">{participant.description}</p>
            </>
          )}
        </div>
        {!editing ? (
          <div className="flex shrink-0">
            <Button variant="ghost" aria-label={`تعديل ${participant.name}`} onClick={() => setEditing(true)}>
              <Pencil className="size-4" aria-hidden />
            </Button>
            <Button variant="ghost" aria-label={`حذف ${participant.name}`} onClick={onRemove}>
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        ) : null}
      </div>

      {skills.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <li key={skill.name}>
              <button
                type="button"
                aria-expanded={openSkill === skill.name}
                title={skill.evidence ?? undefined}
                onClick={() => setOpenSkill(openSkill === skill.name ? null : skill.name)}
                className={`press inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-xs hover:border-ink focus-visible:outline-2 focus-visible:outline-ink ${chipStyle(skill)} ${openSkill === skill.name ? 'ring-1 ring-ink' : ''}`}
              >
                {isPendingConfirmation(skill) ? <AlertTriangle className="size-3 text-warn" aria-label="يحتاج تأكيدًا" /> : null}
                <span className="ltr-value">{skill.name}</span>
                <span className="font-medium">{levelLabel(effectiveLevel(skill))}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {open ? <SkillDetail skill={open} participant={participant} onChange={onChange} /> : null}
    </Card>
  );
}
