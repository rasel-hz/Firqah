'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { ChallengeGate, ChallengeNav } from '@/components/ChallengeNav.tsx';
import { ImportPanel } from '@/components/ImportPanel.tsx';
import { ParticipantCard } from '@/components/ParticipantCard.tsx';
import { Button, Card, CardTitle, EmptyState, Loading, Notice, PersonDots, buttonClass } from '@/components/ui.tsx';
import { analyzeInBatches } from '@/lib/client/analyzeBatches.ts';
import type { BatchReply } from '@/lib/client/analyzeBatches.ts';
import { postJson } from '@/lib/client/api.ts';
import { generateRun } from '@/lib/client/generate.ts';
import type { ImportRow } from '@/lib/csv/participants.ts';
import { alignSkills, applyProfile, effectiveLevel, isPendingConfirmation, nextParticipantId } from '@/lib/state/profiles.ts';
import { useChallenge } from '@/lib/state/store.ts';
import type { StoredParticipant } from '@/lib/state/types.ts';

export default function ParticipantsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { challenge, update, storageFailed } = useChallenge(id);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [partial, setPartial] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  if (!challenge) return <ChallengeGate state={challenge} />;

  const skillNames = challenge.skills.map((s) => s.skill);
  const participants = challenge.participants;
  const notAnalyzed = participants.filter((p) => !p.analyzed);
  const toAnalyze = notAnalyzed.length > 0 ? notAnalyzed : participants;
  const allSkills = participants.flatMap((p) => alignSkills(p, skillNames));
  const pending = allSkills.filter(isPendingConfirmation).length;
  const unknown = allSkills.filter((s) => effectiveLevel(s) === null && !isPendingConfirmation(s)).length;
  const tooManyTeams = challenge.teamCount > participants.length;
  const invalidTeams = challenge.teamCount < 1;

  function addRows(rows: ImportRow[]) {
    update((c) => {
      const added: StoredParticipant[] = [];
      for (const row of rows) {
        added.push({ id: nextParticipantId([...c.participants, ...added]), name: row.name, description: row.description, skills: [], analyzed: false });
      }
      return { ...c, participants: [...c.participants, ...added] };
    });
  }

  async function analyze() {
    const total = toAnalyze.length;
    setAnalyzing(true);
    setError(null);
    setPartial(null);
    setProgress({ done: 0, total });
    const summary = await analyzeInBatches(
      toAnalyze.map((p) => ({ id: p.id, description: p.description })),
      (batch) => postJson<BatchReply>('/api/analyze-participants', { approvedSkills: skillNames, participants: batch }),
      ({ profiles }) => {
        // Saved batch by batch, so finished work survives a later failure or a closed page.
        const byId = new Map(profiles.map((p) => [p.participantId, p]));
        update((c) => ({
          ...c,
          participants: c.participants.map((p) => {
            const profile = byId.get(p.id);
            return profile ? applyProfile(p, profile) : p;
          }),
        }));
        setProgress((current) => ({ done: current.done + profiles.length, total }));
      },
    );
    setAnalyzing(false);
    if (summary.fatal) {
      setError(summary.fatal);
    } else if (summary.missingIds.length > 0) {
      setPartial(`لم يرجع AI نتيجة لـ ${summary.missingIds.length} مشارك. أعد المحاولة أو أدخل مستوياتهم يدويًا.${summary.warning ? ` ${summary.warning}` : ''}`);
    }
  }

  async function generate() {
    if (!challenge) return;
    setGenerating(true);
    setError(null);
    const result = await generateRun(challenge);
    if (!result.ok) {
      setGenerating(false);
      setError({ code: result.code, message: result.message });
      return;
    }
    update((c) => ({ ...c, runs: [result.data, ...c.runs] }));
    router.push(`/challenge/${id}/results`);
  }

  return (
    <div className="space-y-5">
      <ChallengeNav id={id} name={challenge.name} current="participants" />
      {storageFailed ? <Notice tone="error" title="تعذّر الحفظ في المتصفح">قد لا تبقى آخر التعديلات بعد إغلاق الصفحة.</Notice> : null}

      {skillNames.length === 0 ? (
        <Notice tone="warning" title="لا توجد مهارات مطلوبة بعد">
          <Link href={`/challenge/${id}`} className="underline">حدد المهارات في صفحة التحدي</Link> قبل تحليل المشاركين.
        </Notice>
      ) : null}

      <ImportPanel existingNames={participants.map((p) => p.name)} onImport={addRows} />

      <Card className="space-y-4">
        <CardTitle hint="اضغط على أي مهارة لرؤية الدليل والثقة وتصحيح المستوى.">المشاركون ({participants.length})</CardTitle>

        {participants.length > 0 && participants.length !== challenge.plannedParticipants ? (
          <Notice tone="info">العدد المتوقع في التحدي {challenge.plannedParticipants}، وتُحسب الفرق على العدد الفعلي {participants.length}.</Notice>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={analyze} loading={analyzing} disabled={participants.length === 0 || skillNames.length === 0 || generating}>
            {analyzing ? null : <Sparkles className="size-4" aria-hidden />}
            {notAnalyzed.length > 0 ? `تحليل ${notAnalyzed.length} مشارك` : 'إعادة التحليل'}
          </Button>
          {notAnalyzed.length === 0 && participants.length > 0 ? <span className="text-xs text-muted">تعديلاتك اليدوية تبقى كما هي.</span> : null}
        </div>
        {analyzing ? (
          <div className="space-y-2">
            <Loading label={`يحلل AI الأوصاف... اكتمل ${progress.done} من ${progress.total}`} />
            <PersonDots done={progress.done} total={progress.total} />
          </div>
        ) : null}
        {error ? (
          <Notice tone="error" title={error.message}>
            {error.code === 'missing_config' ? 'الوضع اليدوي متاح: اضغط على أي مهارة وحدد المستوى بنفسك. تُعرض هذه القيم على أنها يدوية.' : null}
          </Notice>
        ) : null}
        {partial ? <Notice tone="warning" title={partial} /> : null}

        {pending > 0 ? <Notice tone="warning" title={`${pending} اقتراح يحتاج تأكيدك`}>تبقى هذه القيم مجهولة عند تكوين الفرق حتى تؤكدها أو تصححها.</Notice> : null}

        {participants.length === 0 ? (
          <EmptyState title="لا يوجد مشاركون بعد">أضف مشاركين من ملف CSV أو بلصق نص أو يدويًا.</EmptyState>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {participants.map((p) => (
              <li key={p.id}>
                <ParticipantCard
                  participant={p}
                  skillNames={skillNames}
                  onChange={(next) => update((c) => ({ ...c, participants: c.participants.map((x) => (x.id === next.id ? next : x)) }))}
                  onRemove={() => update((c) => ({ ...c, participants: c.participants.filter((x) => x.id !== p.id) }))}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="space-y-3">
        <CardTitle>تكوين الفرق</CardTitle>
        <p className="text-sm text-muted">
          {participants.length} مشارك على {challenge.teamCount} فرق.
          {unknown > 0 ? ` ${unknown} قيمة مهارة مجهولة، ولن تُحسب كمؤهلة ولا كصفر مؤكد.` : ''}
        </p>
        {tooManyTeams && participants.length > 0 ? <Notice tone="warning" title="عدد الفرق أكبر من عدد المشاركين"><Link href={`/challenge/${id}`} className="underline">عدّله في صفحة التحدي</Link>.</Notice> : null}
        <div className="flex flex-wrap gap-2">
          <Button onClick={generate} loading={generating} disabled={participants.length === 0 || skillNames.length === 0 || tooManyTeams || invalidTeams || analyzing}>
            توليد الفرق
            {generating ? null : <ArrowLeft className="size-4" aria-hidden />}
          </Button>
          {challenge.runs.length > 0 ? <Link href={`/challenge/${id}/results`} className={buttonClass('secondary')}>عرض آخر نتيجة</Link> : null}
        </div>
      </Card>
    </div>
  );
}
