'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Plus, Sparkles, Trash2 } from 'lucide-react';
import { ChallengeGate, ChallengeNav } from '@/components/ChallengeNav.tsx';
import { NodeGlyph } from '@/components/Brand.tsx';
import { Button, Card, CardTitle, Field, LevelSelect, Loading, Notice, SourceBadge, buttonClass, inputClass } from '@/components/ui.tsx';
import { postJson } from '@/lib/client/api.ts';
import type { ChallengeAnalysis } from '@/lib/llama/schemas.ts';
import { computeCapacities } from '@/lib/optimizer/capacity.ts';
import { normalizedWeights } from '@/lib/state/profiles.ts';
import { useChallenge } from '@/lib/state/store.ts';
import type { ChallengeSkill } from '@/lib/state/types.ts';

function describeSizes(participants: number, teams: number): string {
  try {
    const sizes = computeCapacities(participants, teams);
    const big = sizes[0];
    const small = sizes[sizes.length - 1];
    const bigCount = sizes.filter((s) => s === big).length;
    return big === small ? `${teams} فرق، في كل فريق ${big}` : `${bigCount} فرق من ${big} و${teams - bigCount} فرق من ${small}`;
  } catch (error) {
    return error instanceof Error ? error.message : 'الأعداد غير صالحة.';
  }
}

/** An empty or out-of-range field is simply not sent, so it cannot fail the analysis. */
const validCount = (value: number) => (Number.isInteger(value) && value >= 1 && value <= 300 ? value : undefined);

const IMPORTANCE = { critical: 'حرجة', high: 'عالية', medium: 'متوسطة', low: 'منخفضة' } as const;

export default function ChallengeSetupPage() {
  const { id } = useParams<{ id: string }>();
  const { challenge, update, storageFailed } = useChallenge(id);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [newSkill, setNewSkill] = useState('');

  if (!challenge) return <ChallengeGate state={challenge} />;

  const weights = normalizedWeights(challenge.skills);
  const canAnalyze = challenge.name.trim() !== '' && challenge.description.trim() !== '';
  const duplicateSkill = challenge.skills.some((s) => s.skill.toLowerCase() === newSkill.trim().toLowerCase());

  async function analyze() {
    if (!challenge) return;
    setAnalyzing(true);
    setError(null);
    const result = await postJson<{ analysis: ChallengeAnalysis }>('/api/analyze-challenge', {
      name: challenge.name,
      description: challenge.description,
      objective: challenge.objective.trim() || undefined,
      plannedParticipants: validCount(challenge.plannedParticipants),
      teamCount: validCount(challenge.teamCount),
    });
    setAnalyzing(false);
    if (!result.ok) {
      setError({ code: result.code, message: result.message });
      return;
    }
    const { analysis } = result.data;
    update((current) => {
      // Skills the organizer added stay. Suggestions start as soft: only the organizer can make them hard.
      const manual = current.skills.filter((s) => s.source === 'manual');
      const taken = new Set(manual.map((s) => s.skill.toLowerCase()));
      const suggested: ChallengeSkill[] = [];
      for (const s of analysis.required_skills) {
        if (taken.has(s.skill.toLowerCase())) continue;
        taken.add(s.skill.toLowerCase());
        suggested.push({
          skill: s.skill,
          weight: s.weight,
          minLevel: Math.round(s.suggested_minimum_level),
          minPerTeam: Math.round(s.suggested_minimum_per_team),
          hard: false,
          importance: s.importance,
          reason: s.reason,
          source: 'llama',
        });
      }
      return {
        ...current,
        skills: [...suggested, ...manual],
        analysis: {
          challengeType: analysis.challenge_type,
          objective: analysis.objective,
          missingInformation: analysis.missing_information,
          recommendations: analysis.recommendations,
        },
      };
    });
  }

  function updateSkill(skill: string, change: Partial<ChallengeSkill>) {
    update((c) => ({ ...c, skills: c.skills.map((s) => (s.skill === skill ? { ...s, ...change } : s)) }));
  }

  function addSkill() {
    const skill = newSkill.trim();
    if (!skill || duplicateSkill) return;
    update((c) => ({
      ...c,
      skills: [...c.skills, { skill, weight: 10, minLevel: 3, minPerTeam: 0, hard: false, importance: null, reason: null, source: 'manual' }],
    }));
    setNewSkill('');
  }

  return (
    <div className="space-y-5">
      <ChallengeNav id={id} name={challenge.name} current="setup" />
      {storageFailed ? <Notice tone="error" title="تعذّر الحفظ في المتصفح">قد لا تبقى آخر التعديلات بعد إغلاق الصفحة.</Notice> : null}

      <Card className="space-y-4">
        <CardTitle>بيانات التحدي</CardTitle>
        <Field label="اسم التحدي">
          <input className={inputClass} maxLength={200} value={challenge.name} onChange={(e) => update((c) => ({ ...c, name: e.target.value }))} />
        </Field>
        <Field label="وصف التحدي">
          <textarea className={`${inputClass} min-h-28`} maxLength={5000} value={challenge.description} onChange={(e) => update((c) => ({ ...c, description: e.target.value }))} />
        </Field>
        <Field label="الهدف الرئيسي (اختياري)">
          <input className={inputClass} maxLength={1000} value={challenge.objective} onChange={(e) => update((c) => ({ ...c, objective: e.target.value }))} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="عدد المشاركين المتوقع">
            <input type="number" min={1} max={300} className={inputClass} value={challenge.plannedParticipants} onChange={(e) => update((c) => ({ ...c, plannedParticipants: Math.trunc(Number(e.target.value)) }))} />
          </Field>
          <Field label="عدد الفرق">
            <input type="number" min={1} max={300} className={inputClass} value={challenge.teamCount} onChange={(e) => update((c) => ({ ...c, teamCount: Math.trunc(Number(e.target.value)) }))} />
          </Field>
        </div>
        <p className="text-sm text-muted">{describeSizes(challenge.plannedParticipants, challenge.teamCount)}</p>
        <Button onClick={analyze} loading={analyzing} disabled={!canAnalyze}>
          {analyzing ? null : <Sparkles className="size-4" aria-hidden />}
          تحليل التحدي
        </Button>
        {!canAnalyze ? <p className="text-xs text-muted">اكتب الاسم والوصف لتفعيل التحليل.</p> : null}
        {analyzing ? <Loading label="يحلل AI التحدي..." /> : null}
        {error ? (
          <Notice tone="error" title={error.message}>
            {error.code === 'missing_config' ? 'يمكنك المتابعة في الوضع اليدوي بإضافة المهارات بنفسك أدناه.' : null}
          </Notice>
        ) : null}
      </Card>

      {challenge.analysis ? (
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><NodeGlyph />تحليل التحدي</h2>
            <SourceBadge kind="llama" />
          </div>
          <p className="text-sm"><span className="text-muted">النوع: </span>{challenge.analysis.challengeType}</p>
          <p className="text-sm"><span className="text-muted">الهدف: </span>{challenge.analysis.objective}</p>
          {challenge.analysis.missingInformation.length > 0 ? (
            <Notice tone="warning" title="معلومات ناقصة">
              <ul className="list-disc space-y-1 ps-4">{challenge.analysis.missingInformation.map((item) => <li key={item}>{item}</li>)}</ul>
            </Notice>
          ) : null}
          {challenge.analysis.recommendations.length > 0 ? (
            <div className="text-sm">
              <p className="mb-1 text-muted">توصيات</p>
              <ul className="list-disc space-y-1 ps-4">{challenge.analysis.recommendations.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          ) : null}
        </Card>
      ) : null}

      <Card className="space-y-4">
        <CardTitle hint="كل ما يقترحه AI قابل للتعديل. يصبح الشرط إلزاميًا فقط إذا فعّلته أنت.">المهارات المطلوبة</CardTitle>
        {challenge.skills.length === 0 ? <p className="text-sm text-muted">لا توجد مهارات بعد. حلّل التحدي أو أضف مهارة يدويًا.</p> : null}
        <ul className="space-y-3">
          {challenge.skills.map((skill, i) => (
            <li key={skill.skill} className="arrive space-y-3 rounded-2xl bg-raised p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium ltr-value">{skill.skill}</span>
                <SourceBadge kind={skill.source} />
                {skill.importance ? <span className="text-xs text-muted">الأهمية: {IMPORTANCE[skill.importance]}</span> : null}
                <Button variant="ghost" className="ms-auto" aria-label={`حذف ${skill.skill}`} onClick={() => update((c) => ({ ...c, skills: c.skills.filter((s) => s.skill !== skill.skill) }))}>
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
              {skill.reason ? <p className="text-sm text-muted">{skill.reason}</p> : null}
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="الوزن" hint={`بعد التوحيد: ${weights[i]}%`}>
                  <input type="number" min={0} max={100} className={inputClass} value={skill.weight} onChange={(e) => updateSkill(skill.skill, { weight: Math.min(100, Math.max(0, Number(e.target.value))) })} />
                </Field>
                <Field label="أدنى مستوى">
                  <LevelSelect label={`أدنى مستوى لمهارة ${skill.skill}`} allowUnknown={false} value={skill.minLevel} onChange={(level) => updateSkill(skill.skill, { minLevel: level ?? 0 })} />
                </Field>
                <Field label="العدد لكل فريق">
                  <input type="number" min={skill.hard ? 1 : 0} max={10} className={inputClass} value={skill.hard ? Math.max(1, skill.minPerTeam) : skill.minPerTeam} onChange={(e) => updateSkill(skill.skill, { minPerTeam: Math.min(10, Math.max(0, Math.trunc(Number(e.target.value)))) })} />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="size-4 accent-violet-deep" checked={skill.hard} onChange={(e) => updateSkill(skill.skill, { hard: e.target.checked })} />
                شرط إلزامي في كل فريق
              </label>
            </li>
          ))}
        </ul>
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); addSkill(); }}>
          <input aria-label="اسم مهارة جديدة" placeholder="اسم مهارة جديدة" className={`${inputClass} min-w-0 flex-1`} maxLength={80} value={newSkill} onChange={(e) => setNewSkill(e.target.value)} />
          <Button type="submit" variant="secondary" disabled={!newSkill.trim() || duplicateSkill}>
            <Plus className="size-4" aria-hidden />
            إضافة
          </Button>
        </form>
        {duplicateSkill && newSkill.trim() ? <p className="text-xs text-warn">هذه المهارة موجودة.</p> : null}
      </Card>

      {challenge.skills.length > 0 ? (
        <div className="flex justify-end">
          <Link href={`/challenge/${id}/participants`} className={buttonClass()}>
            التالي: المشاركون
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
