'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CheckCircle2, Download, RefreshCw, Sparkles, XCircle } from 'lucide-react';
import { ChallengeGate, ChallengeNav } from '@/components/ChallengeNav.tsx';
import { BarRow, RollingNumber, SkillHeatmap } from '@/components/Charts.tsx';
import { TeamBoard } from '@/components/TeamBoard.tsx';
import { Button, Card, CardTitle, EmptyState, Field, Loading, Notice, SourceBadge, buttonClass, inputClass, levelLabel } from '@/components/ui.tsx';
import { downloadText, postJson } from '@/lib/client/api.ts';
import { buildRunInput, generateRun } from '@/lib/client/generate.ts';
import { buildTeamsCsv } from '@/lib/csv/exportTeams.ts';
import { teamCoverage } from '@/lib/optimizer/breakdown.ts';
import { SCORE_WEIGHTS, normalizeRequirements } from '@/lib/optimizer/scoring.ts';
import { boardFinding, buildBoard } from '@/lib/results/board.ts';
import { useChallenge } from '@/lib/state/store.ts';
import type { GenerationRun, TeamReviewEntry } from '@/lib/state/types.ts';

function ReviewList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1 text-xs text-muted">{title}</p>
      <ul className="list-disc space-y-1 ps-4 text-sm">{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </div>
  );
}

function TeamReview({ review }: { review: TeamReviewEntry }) {
  return (
    <div className="space-y-3 rounded-2xl bg-raised p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">مراجعة الفريق</span>
        <SourceBadge kind="llama" />
      </div>
      <p className="text-sm">{review.summary}</p>
      <ReviewList title="نقاط القوة" items={review.strengths} />
      <ReviewList title="الفجوات" items={review.gaps} />
      <ReviewList title="المخاطر" items={review.risks} />
      <ReviewList title="التوصيات" items={review.recommendations} />
    </div>
  );
}

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const { challenge, update, storageFailed } = useChallenge(id);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const requested = useRef(new Set<string>());

  const run: GenerationRun | undefined = challenge?.runs.find((r) => r.id === selectedRunId) ?? challenge?.runs[0];

  const requestReview = useCallback(
    async (target: GenerationRun, challengeName: string, objective: string) => {
      setReviewing(true);
      const reply = await postJson<{ reviews: TeamReviewEntry[]; missingTeamIds: string[] }>('/api/review-teams', {
        challenge: { name: challengeName.trim() || 'تحدٍ بلا اسم', objective: objective.trim() || undefined },
        participants: target.input.participants,
        requirements: target.input.requirements,
        teams: target.result.teams,
      });
      setReviewing(false);
      update((c) => ({
        ...c,
        runs: c.runs.map((r) =>
          r.id !== target.id
            ? r
            : reply.ok
              ? { ...r, review: { reviews: reply.data.reviews, missingTeamIds: reply.data.missingTeamIds }, reviewError: null }
              : { ...r, review: null, reviewError: reply.message },
        ),
      }));
    },
    [update],
  );

  // Asks for the review once per run. A failure is stored and shown; the valid teams stay on screen either way.
  useEffect(() => {
    if (!challenge || !run || run.result.status !== 'ok' || run.review || run.reviewError) return;
    if (requested.current.has(run.id)) return;
    requested.current.add(run.id);
    void requestReview(run, challenge.name, challenge.objective);
  }, [challenge, run, requestReview]);

  const stale = useMemo(() => {
    if (!challenge || !run) return false;
    return JSON.stringify(buildRunInput(challenge)) !== JSON.stringify(run.input);
  }, [challenge, run]);

  if (!challenge) return <ChallengeGate state={challenge} />;

  async function regenerate() {
    if (!challenge) return;
    setGenerating(true);
    setGenerateError(null);
    const result = await generateRun(challenge, Math.floor(Math.random() * 1_000_000_000));
    setGenerating(false);
    if (!result.ok) {
      setGenerateError(result.message);
      return;
    }
    update((c) => ({ ...c, runs: [result.data, ...c.runs] }));
    setSelectedRunId(result.data.id);
  }

  const canGenerate = challenge.participants.length > 0 && challenge.skills.length > 0 && challenge.teamCount >= 1 && challenge.teamCount <= challenge.participants.length;

  const regenerateButton = (
    <Button variant={run ? 'secondary' : 'primary'} onClick={regenerate} loading={generating} disabled={!canGenerate}>
      {generating ? null : <RefreshCw className="size-4" aria-hidden />}
      {run ? 'إعادة التوليد' : 'توليد الفرق'}
    </Button>
  );

  if (!run) {
    return (
      <div className="space-y-[14px]">
        <ChallengeNav id={id} name={challenge.name} current="results" />
        <EmptyState title="لم تُولَّد فرق بعد">
          <p className="mb-3">أضف المشاركين وتحقق من مهاراتهم، ثم ولّد الفرق.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href={`/challenge/${id}/participants`} className={buttonClass('secondary')}>المشاركون</Link>
            {canGenerate ? regenerateButton : null}
          </div>
        </EmptyState>
        {generateError ? <Notice tone="error" title={generateError} /> : null}
      </div>
    );
  }

  const { result, input } = run;
  const requirements = normalizeRequirements(input.requirements);
  const skills = requirements.map((r) => r.skill);
  const hardRules = requirements.filter((r) => r.hard);
  const score = result.score;
  const board = buildBoard(result.teams, result.teamMetrics, input.participants, requirements);
  const openTeam = board.find((t) => t.id === selectedTeam) ?? board[0];
  const openIndex = openTeam ? board.indexOf(openTeam) : -1;
  const openMetrics = openIndex >= 0 ? result.teamMetrics[openIndex] : undefined;
  const openReview = openTeam ? run.review?.reviews.find((r) => r.team_id === openTeam.id) : undefined;
  const lead = score && result.baseline ? Math.round((score.overall - result.baseline.maxOverall) * 100) / 100 : null;

  function exportCsv() {
    downloadText(`firqah-teams-${run?.result.seed}.csv`, buildTeamsCsv({ teams: result.teams, participants: input.participants, skills }));
  }

  return (
    <div className="space-y-[14px]">
      <ChallengeNav id={id} name={challenge.name} current="results" />
      {storageFailed ? <Notice tone="error" title="تعذّر الحفظ في المتصفح">قد لا تبقى آخر التعديلات بعد إغلاق الصفحة.</Notice> : null}
      {generateError ? <Notice tone="error" title={generateError} /> : null}
      {stale ? <Notice tone="warning" title="تغيّرت بيانات التحدي أو المشاركين بعد هذه النتيجة">أعد التوليد ليعتمد على آخر البيانات.</Notice> : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-muted">{result.status === 'ok' ? boardFinding(board) : ''}</p>
        <div className="flex flex-wrap items-end gap-2">
          {challenge.runs.length > 1 ? (
            <div className="w-full sm:w-60">
              <Field label="النتائج السابقة">
                <select className={inputClass} value={run.id} onChange={(e) => setSelectedRunId(e.target.value)}>
                  {challenge.runs.map((r) => (
                    <option key={r.id} value={r.id}>
                      {new Date(r.createdAt).toLocaleString('ar-SA-u-nu-latn')} {r.result.score ? `(${r.result.score.overall})` : '(لا توجد فرق)'}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          ) : null}
          {regenerateButton}
          {result.status === 'ok' ? (
            <Button variant="secondary" onClick={exportCsv}>
              <Download className="size-4" aria-hidden />
              تصدير CSV
            </Button>
          ) : null}
        </div>
      </div>

      {result.status !== 'ok' ? (
        <Notice tone="error" title={result.status === 'infeasible' ? 'لا يمكن تحقيق الشروط الحالية' : 'لم يجد البحث توزيعًا صالحًا'}>
          <ul className="list-disc space-y-1 ps-4">{result.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          <p className="mt-2">
            لم تُكوَّن فرق، ولم يُخفَّف أي شرط تلقائيًا. راجع <Link href={`/challenge/${id}`} className="underline">الشروط</Link> أو{' '}
            <Link href={`/challenge/${id}/participants`} className="underline">مهارات المشاركين</Link>.
          </p>
        </Notice>
      ) : null}

      {result.status === 'ok' && score && openTeam && openMetrics ? (
        <>
          <section aria-label="الملخص" className="rise grid grid-cols-2 gap-px overflow-hidden rounded-[20px] bg-canvas lg:grid-cols-4">
            <div className="bg-surface p-4 sm:p-[22px]">
              <p className="text-[13px] text-muted">الدرجة الإجمالية</p>
              <p className="mt-1 text-start text-[26px] leading-10 font-semibold whitespace-nowrap sm:text-[32px]">
                <RollingNumber key={run.id} value={score.overall} />
                <span className="ltr-value text-sm font-normal text-muted"> / 100</span>
              </p>
            </div>
            <div className="bg-surface p-4 sm:p-[22px]">
              <p className="text-[13px] text-muted">الشروط الإلزامية</p>
              <p className={`mt-1 flex items-center gap-2 text-base leading-10 font-medium ${result.validation.valid ? 'text-good' : 'text-bad'}`}>
                {result.validation.valid ? <CheckCircle2 className="size-4" aria-hidden /> : <XCircle className="size-4" aria-hidden />}
                {result.validation.valid ? 'كلها محققة' : 'غير محققة'}
              </p>
            </div>
            <div className="bg-surface p-4 sm:p-[22px]">
              <p className="text-[13px] text-muted">مقابل أفضل توزيع عشوائي</p>
              <p className="ltr-value num mt-1 text-start text-2xl leading-10 font-medium">{lead === null ? '—' : `${lead > 0 ? '+' : ''}${lead}`}</p>
            </div>
            <div className="bg-surface p-4 sm:p-[22px]">
              <p className="text-[13px] text-muted">قيم المهارات المجهولة</p>
              <p className="ltr-value num mt-1 text-start text-2xl leading-10 font-medium">{Math.round(score.unknownRatio * 100)}%</p>
            </div>
          </section>

          <div className="rise" style={{ '--step': 1 } as React.CSSProperties}>
            <TeamBoard runId={run.id} teams={board} skills={skills} selected={openTeam.id} onSelect={setSelectedTeam} />
          </div>

          <Card className="rise space-y-4" key={`${run.id}-${openTeam.id}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="ltr-value text-base font-semibold">{openTeam.id}</h2>
              <span className="text-sm text-muted">
                التغطية <span className="ltr-value num font-medium text-ink">{teamCoverage(openMetrics, requirements)}%</span> · الخبرة{' '}
                <span className="ltr-value num font-medium text-ink">{openMetrics.experience}</span>
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <ul className="divide-y divide-line text-sm">
                  {openTeam.members.map((member) => (
                    <li key={member.id} className="flex flex-wrap items-baseline justify-between gap-x-3 py-2">
                      <span>{member.name}</span>
                      <span className="text-xs text-muted">{member.qualified.join('، ') || '—'}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <SourceBadge kind="computed" />
                  {openTeam.status.every((s) => s.status === 'met') ? <span className="text-good">كل المهارات المطلوبة مغطاة</span> : null}
                  {openTeam.status.some((s) => s.status === 'missing') ? (
                    <span className="text-bad">نقص: <span className="ltr-value">{openTeam.status.filter((s) => s.status === 'missing').map((s) => s.skill).join('، ')}</span></span>
                  ) : null}
                  {openTeam.status.some((s) => s.status === 'unconfirmed') ? (
                    <span className="text-muted">غير مؤكدة: <span className="ltr-value">{openTeam.status.filter((s) => s.status === 'unconfirmed').map((s) => s.skill).join('، ')}</span></span>
                  ) : null}
                </div>
              </div>
              <div className="space-y-2">
                {reviewing && !openReview ? <Loading label="يكتب Llama مراجعة الفرق..." /> : null}
                {run.reviewError ? (
                  <Notice tone="warning" title="مراجعة Llama غير متاحة">
                    <p>{run.reviewError} الفرق صالحة ولا تعتمد على المراجعة.</p>
                    <Button variant="secondary" className="mt-2" loading={reviewing} onClick={() => void requestReview(run, challenge.name, challenge.objective)}>
                      <Sparkles className="size-4" aria-hidden />
                      إعادة المحاولة
                    </Button>
                  </Notice>
                ) : null}
                {openReview ? <TeamReview review={openReview} /> : null}
                {run.review && !openReview ? <Notice tone="warning" title="لم يرجع Llama مراجعة لهذا الفريق" /> : null}
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-3">
            <Card className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold">تفصيل الدرجة</h2>
                <SourceBadge kind="computed" />
              </div>
              <div className="space-y-2">
                <BarRow label={`التغطية (${SCORE_WEIGHTS.coverage * 100}%)`} value={score.coverage} max={100} display={String(score.coverage)} />
                <BarRow label={`توازن المهارات (${SCORE_WEIGHTS.balance * 100}%)`} value={score.balance} max={100} display={String(score.balance)} step={1} />
                <BarRow label={`توازن الخبرة (${SCORE_WEIGHTS.experience * 100}%)`} value={score.experience} max={100} display={String(score.experience)} step={2} />
              </div>
              <p className="text-xs text-muted">أفضل حل صالح وجده البحث. درجة وفق المعايير المحددة، وليست احتمال نجاح الفريق.</p>
              {score.unknownRatio > 0 ? (
                <p className="text-xs text-muted">
                  كلما زادت القيم المجهولة قلّت الثقة في هذه الدرجة. <Link href={`/challenge/${id}/participants`} className="text-ink underline">أكمل البيانات</Link>.
                </p>
              ) : null}
            </Card>

            <Card className="space-y-3">
              <CardTitle hint="الفرق التي فيها العدد المطلوب من المؤهلين.">تغطية المهارات</CardTitle>
              <div className="space-y-2">
                {score.perRequirement.map((r, i) => (
                  <BarRow key={r.skill} label={r.skill} value={r.ratio} max={1} display={`${r.teamsSatisfied}/${r.teamCount}`} title={`${r.skill}: ${r.teamsSatisfied} من ${r.teamCount} فرق`} step={i} />
                ))}
              </div>
            </Card>

            {result.baseline ? (
              <Card className="space-y-3">
                <CardTitle hint={`${result.baseline.runs} توزيعًا عشوائيًا بأحجام صحيحة وبنفس التقييم، مقاسة في هذا التشغيل.`}>مقارنة بالعشوائي</CardTitle>
                <div className="space-y-2">
                  <BarRow label="هذه الفرق" value={score.overall} max={100} display={String(score.overall)} />
                  <BarRow label="أفضل عشوائي" tone="muted" value={result.baseline.maxOverall} max={100} display={String(result.baseline.maxOverall)} step={1} />
                  <BarRow label="متوسط العشوائي" tone="muted" value={result.baseline.meanOverall} max={100} display={String(result.baseline.meanOverall)} step={2} />
                  <BarRow label="أقل عشوائي" tone="muted" value={result.baseline.minOverall} max={100} display={String(result.baseline.minOverall)} step={3} />
                </div>
                {hardRules.length > 0 ? <p className="text-xs text-muted">حقق {Math.round(result.baseline.validShare * 100)}% من التوزيعات العشوائية كل الشروط الإلزامية.</p> : null}
              </Card>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-3">
            <Card className="space-y-3 lg:col-span-2">
              <CardTitle>توزيع المهارات بين الفرق</CardTitle>
              <SkillHeatmap skills={skills} metrics={result.teamMetrics} />
            </Card>
            <Card className="space-y-3">
              <CardTitle>التحقق من الشروط</CardTitle>
              <ul className="space-y-1 text-sm text-muted">
                <li>كل مشارك في فريق واحد فقط (<span className="num">{input.participants.length}</span> مشارك)</li>
                <li>أحجام الفرق: <span className="ltr-value num">{result.capacities.join('، ')}</span></li>
                {hardRules.length === 0 ? <li>لم تُفعَّل شروط مهارات إلزامية.</li> : null}
                {hardRules.map((rule) => (
                  <li key={rule.skill}>
                    <span className="ltr-value">{rule.skill}</span>: {rule.minPerTeam} على الأقل في كل فريق بمستوى {levelLabel(rule.minLevel)}+
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted">صلاحية الشروط منفصلة عن الدرجة.</p>
              <p className="text-xs text-muted">الرقم المرجعي للتوزيع (seed): <span className="ltr-value num">{result.seed}</span></p>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
