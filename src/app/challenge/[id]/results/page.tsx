'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CheckCircle2, Download, RefreshCw, Sparkles, XCircle } from 'lucide-react';
import { ChallengeGate, ChallengeNav } from '@/components/ChallengeNav.tsx';
import { BarRow, SkillHeatmap, memberName } from '@/components/Charts.tsx';
import { Button, Card, CardTitle, EmptyState, Field, Loading, Notice, SourceBadge, buttonClass, inputClass, levelLabel } from '@/components/ui.tsx';
import { downloadText, postJson } from '@/lib/client/api.ts';
import { buildRunInput, generateRun } from '@/lib/client/generate.ts';
import { buildTeamsCsv } from '@/lib/csv/exportTeams.ts';
import { skillStatus } from '@/lib/llama/review.ts';
import { teamCoverage } from '@/lib/optimizer/breakdown.ts';
import { SCORE_WEIGHTS, normalizeRequirements } from '@/lib/optimizer/scoring.ts';
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
    <div className="space-y-2 rounded-lg border border-accent-soft/30 bg-raised/40 p-3">
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
    <Button variant="secondary" onClick={regenerate} loading={generating} disabled={!canGenerate}>
      {generating ? null : <RefreshCw className="size-4" aria-hidden />}
      {run ? 'إعادة التوليد' : 'توليد الفرق'}
    </Button>
  );

  if (!run) {
    return (
      <div className="space-y-5">
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

  function exportCsv() {
    downloadText(`firqah-teams-${run?.result.seed}.csv`, buildTeamsCsv({ teams: result.teams, participants: input.participants, skills }));
  }

  return (
    <div className="space-y-5">
      <ChallengeNav id={id} name={challenge.name} current="results" />
      {storageFailed ? <Notice tone="error" title="تعذّر الحفظ في المتصفح">قد لا تبقى آخر التعديلات بعد إغلاق الصفحة.</Notice> : null}
      {generateError ? <Notice tone="error" title={generateError} /> : null}
      {stale ? <Notice tone="warning" title="تغيّرت بيانات التحدي أو المشاركين بعد هذه النتيجة">أعد التوليد ليعتمد على آخر البيانات.</Notice> : null}

      <div className="flex flex-wrap items-end gap-2">
        {regenerateButton}
        {result.status === 'ok' ? (
          <Button variant="secondary" onClick={exportCsv}>
            <Download className="size-4" aria-hidden />
            تصدير CSV
          </Button>
        ) : null}
        {challenge.runs.length > 1 ? (
          <div className="ms-auto w-full sm:w-64">
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

      {result.status === 'ok' && score ? (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold">الدرجة الإجمالية</h2>
                <SourceBadge kind="computed" />
              </div>
              <p className="text-5xl font-bold tabular-nums ltr-value text-start">{score.overall}<span className="text-xl font-normal text-muted"> / 100</span></p>
              <p className="text-sm text-muted">أفضل حل صالح وجده البحث. هذه درجة وفق المعايير المحددة، وليست احتمال نجاح الفريق.</p>
              <div className="space-y-2">
                <BarRow label={`التغطية (${SCORE_WEIGHTS.coverage * 100}%)`} value={score.coverage} max={100} display={String(score.coverage)} />
                <BarRow label={`توازن المهارات (${SCORE_WEIGHTS.balance * 100}%)`} value={score.balance} max={100} display={String(score.balance)} />
                <BarRow label={`توازن الخبرة (${SCORE_WEIGHTS.experience * 100}%)`} value={score.experience} max={100} display={String(score.experience)} />
              </div>
              {score.unknownRatio > 0 ? (
                <Notice tone="warning" title={`${Math.round(score.unknownRatio * 100)}% من قيم المهارات مجهولة`}>
                  كلما زادت القيم المجهولة قلّت الثقة في هذه الدرجة. <Link href={`/challenge/${id}/participants`} className="underline">أكمل البيانات</Link>.
                </Notice>
              ) : null}
            </Card>

            <Card className="space-y-3">
              <CardTitle>التحقق من الشروط</CardTitle>
              <div className={`flex items-center gap-2 text-sm font-medium ${result.validation.valid ? 'text-good' : 'text-bad'}`}>
                {result.validation.valid ? <CheckCircle2 className="size-4" aria-hidden /> : <XCircle className="size-4" aria-hidden />}
                {result.validation.valid ? 'كل الشروط الإلزامية محققة' : 'توجد شروط غير محققة'}
              </div>
              <ul className="space-y-1 text-sm text-muted">
                <li>كل مشارك في فريق واحد فقط ({input.participants.length} مشارك)</li>
                <li>أحجام الفرق: <span className="ltr-value">{result.capacities.join('، ')}</span></li>
                {hardRules.length === 0 ? <li>لم تُفعَّل شروط مهارات إلزامية.</li> : null}
                {hardRules.map((rule) => (
                  <li key={rule.skill}>
                    <span className="ltr-value">{rule.skill}</span>: {rule.minPerTeam} على الأقل في كل فريق بمستوى {levelLabel(rule.minLevel)}+
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted">صلاحية الشروط منفصلة عن الدرجة.</p>
              <p className="text-xs text-muted">الرقم المرجعي للتوزيع (seed): <span className="ltr-value">{result.seed}</span></p>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="space-y-3">
              <CardTitle hint="نسبة الفرق التي فيها العدد المطلوب من المؤهلين لكل مهارة.">تغطية المهارات</CardTitle>
              <div className="space-y-2">
                {score.perRequirement.map((r) => (
                  <BarRow key={r.skill} label={r.skill} value={r.ratio} max={1} display={`${r.teamsSatisfied}/${r.teamCount}`} title={`${r.skill}: ${r.teamsSatisfied} من ${r.teamCount} فرق`} />
                ))}
              </div>
            </Card>

            {result.baseline ? (
              <Card className="space-y-3">
                <CardTitle hint={`${result.baseline.runs} توزيعًا عشوائيًا بأحجام صحيحة، بنفس دالة التقييم. قياس حقيقي من هذا التشغيل.`}>مقارنة بالتوزيع العشوائي</CardTitle>
                <div className="space-y-2">
                  <BarRow label="هذه الفرق" tone="accent" value={score.overall} max={100} display={String(score.overall)} />
                  <BarRow label="أفضل عشوائي" tone="muted" value={result.baseline.maxOverall} max={100} display={String(result.baseline.maxOverall)} />
                  <BarRow label="متوسط العشوائي" tone="muted" value={result.baseline.meanOverall} max={100} display={String(result.baseline.meanOverall)} />
                  <BarRow label="أقل عشوائي" tone="muted" value={result.baseline.minOverall} max={100} display={String(result.baseline.minOverall)} />
                </div>
                {hardRules.length > 0 ? <p className="text-xs text-muted">حقق {Math.round(result.baseline.validShare * 100)}% من التوزيعات العشوائية كل الشروط الإلزامية.</p> : null}
              </Card>
            ) : null}
          </div>

          <Card className="space-y-3">
            <CardTitle>توزيع المهارات بين الفرق</CardTitle>
            <SkillHeatmap skills={skills} metrics={result.teamMetrics} />
          </Card>

          {reviewing ? <Loading label="يكتب Llama مراجعة الفرق..." /> : null}
          {run.reviewError ? (
            <Notice tone="warning" title="مراجعة Llama غير متاحة">
              <p>{run.reviewError} الفرق أدناه صالحة ولا تعتمد على المراجعة.</p>
              <Button variant="secondary" className="mt-2" loading={reviewing} onClick={() => void requestReview(run, challenge.name, challenge.objective)}>
                <Sparkles className="size-4" aria-hidden />
                إعادة المحاولة
              </Button>
            </Notice>
          ) : null}
          {run.review && run.review.missingTeamIds.length > 0 ? (
            <Notice tone="warning" title={`لم يرجع Llama مراجعة للفرق: ${run.review.missingTeamIds.join('، ')}`} />
          ) : null}

          <section aria-labelledby="teams-heading" className="space-y-3">
            <h2 id="teams-heading" className="text-lg font-bold">الفرق</h2>
            <ul className="grid gap-4 lg:grid-cols-2">
              {result.teams.map((team, i) => {
                const metrics = result.teamMetrics[i];
                const review = run.review?.reviews.find((r) => r.team_id === team.id);
                const levelsOf = (skill: string) => team.memberIds.map((memberId) => input.participants.find((p) => p.id === memberId)?.skills[skill] ?? null);
                const missing = metrics.gaps.filter((g) => skillStatus(metrics.gaps, g, levelsOf(g)) === 'missing');
                const unconfirmed = metrics.gaps.filter((g) => skillStatus(metrics.gaps, g, levelsOf(g)) === 'unconfirmed');
                return (
                  <li key={team.id}>
                    <Card className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-bold ltr-value">{team.id}</h3>
                        <span className="text-sm text-muted">التغطية <span className="ltr-value font-medium text-ink">{teamCoverage(metrics, requirements)}%</span> · الخبرة <span className="ltr-value font-medium text-ink">{metrics.experience}</span></span>
                      </div>
                      <ul className="space-y-1 text-sm">
                        {team.memberIds.map((memberId) => {
                          const person = input.participants.find((p) => p.id === memberId);
                          return (
                            <li key={memberId} className="flex flex-wrap items-baseline justify-between gap-x-3">
                              <span>{memberName(input.participants, memberId)}</span>
                              <span className="text-xs text-muted">
                                {requirements
                                  .filter((r) => {
                                    const level = person?.skills[r.skill];
                                    return typeof level === 'number' && level >= r.minLevel;
                                  })
                                  .map((r) => r.skill)
                                  .join('، ') || '—'}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3 text-sm">
                        <SourceBadge kind="computed" />
                        {metrics.gaps.length === 0 ? <span className="text-good">كل المهارات المطلوبة مغطاة</span> : null}
                        {missing.length > 0 ? <span className="text-warn">فجوات: <span className="ltr-value">{missing.join('، ')}</span></span> : null}
                        {unconfirmed.length > 0 ? <span className="text-muted">غير مؤكدة: <span className="ltr-value">{unconfirmed.join('، ')}</span></span> : null}
                      </div>
                      {review ? <TeamReview review={review} /> : null}
                    </Card>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}
