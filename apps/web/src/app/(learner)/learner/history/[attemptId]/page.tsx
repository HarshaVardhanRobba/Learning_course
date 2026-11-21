import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Icon } from '@iconify/react'
import { lessonIdSchema, type AttemptDetail } from '@workspace/core'
import { StatePill } from '@/components/learner/learning-map'
import { AttemptStatusPill, ScorePill, courseName, historyDate, historyDateTime } from '@/components/learner/history/history-parts'
import { requireSessionUser } from '@/lib/learner'
import { LEARNER_ROUTES, courseRoutes } from '@/lib/routes'
import { caller } from '@/trpc/server'

export const metadata = { title: 'Attempt history' }

const card = 'rounded-[1.75rem] border border-sand bg-white/70 dark:border-cocoa dark:bg-cocoa/40'
const sectionHeading = 'font-display text-2xl font-semibold text-ink dark:text-cream'

export default async function AttemptHistoryPage({ params }: PageProps<'/learner/history/[attemptId]'>) {
  await requireSessionUser()
  const id = lessonIdSchema.safeParse((await params).attemptId)
  if (!id.success) notFound()

  // Returns null for attempts that don't exist or belong to someone else: both are a 404.
  const detail = await caller.learner.history.attempt({ enrollmentId: id.data })
  if (!detail) notFound()
  const { summary } = detail
  const mapHref = courseRoutes(summary.course).map(summary.status === 'in_progress' ? undefined : summary.attemptNumber)

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 sm:px-6 sm:pt-8">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-taupe dark:text-sand/70">
        <Link href={LEARNER_ROUTES.history} className="hover:text-ink dark:hover:text-cream">
          Learning history
        </Link>
        <Icon icon="solar:alt-arrow-right-linear" width={12} aria-hidden="true" />
        <span aria-current="page" className="text-ink dark:text-cream">
          Attempt #{summary.attemptNumber}
        </span>
      </nav>

      <header className="mt-6 border-b border-sand pb-6 dark:border-cocoa">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
              {summary.course.kind === 'foundation' ? 'Foundation' : 'Track'} · attempt #{summary.attemptNumber} · v{summary.version}
            </p>
            <h1 className="mt-1 break-words font-display text-3xl font-semibold tracking-tight text-ink sm:text-5xl dark:text-cream">{courseName(summary.course)}</h1>
          </div>
          <AttemptStatusPill status={summary.status} />
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
          <Field label="Started" value={historyDate.format(summary.startedAt)} />
          <Field label="Completed" value={summary.completedAt ? historyDate.format(summary.completedAt) : '—'} />
          <Field label="Progress" value={`${summary.percent}% · ${summary.completedTopics}/${summary.totalTopics} topics`} />
          <Field label="Best assessment" value={summary.bestAssessmentScore === null ? '—' : `${summary.bestAssessmentScore}%`} />
        </dl>
        <Link href={mapHref} className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:underline dark:text-cream">
          <Icon icon="solar:map-linear" width={16} aria-hidden="true" />
          Open this attempt’s map
        </Link>
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-10">
          <PhaseHistory phases={detail.phases} />
          <QuizHistory attempts={detail.quizAttempts} />
          <AssessmentHistory attempts={detail.assessmentAttempts} />
        </div>
        <BadgeHistory badges={detail.badges} />
      </div>
    </main>
  )
}

function PhaseHistory({ phases }: { phases: AttemptDetail['phases'] }) {
  return (
    <section aria-labelledby="phases-heading">
      <h2 id="phases-heading" className={sectionHeading}>
        Phases and topics
      </h2>
      <ol className="mt-4 space-y-4">
        {phases.map((phase) => (
          <li key={phase.id} className={`${card} p-5`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold text-ink dark:text-cream">
                Phase {phase.position}: {phase.title}
              </p>
              <span className="flex items-center gap-3 text-sm text-taupe dark:text-sand/70">
                {phase.completedAt && <span>Completed {historyDate.format(phase.completedAt)}</span>}
                <StatePill state={phase.state} />
              </span>
            </div>
            <ul className="mt-3 divide-y divide-sand text-sm dark:divide-cocoa">
              {phase.topics.map((topic) => (
                <li key={topic.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="flex items-center gap-2 text-ink dark:text-cream">
                    <Icon
                      icon={topic.state === 'completed' ? 'solar:check-circle-bold' : topic.state === 'locked' ? 'solar:lock-keyhole-minimalistic-linear' : 'solar:record-circle-linear'}
                      width={16}
                      className={topic.state === 'completed' ? 'text-emerald-600' : 'text-taupe'}
                      aria-hidden="true"
                    />
                    {topic.title}
                  </span>
                  <span className="text-taupe dark:text-sand/60">
                    {topic.completedAt ? `Passed ${historyDate.format(topic.completedAt)}` : topic.state === 'locked' ? 'Locked' : 'Not passed'}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  )
}

function QuizHistory({ attempts }: { attempts: AttemptDetail['quizAttempts'] }) {
  return (
    <section aria-labelledby="quizzes-heading">
      <h2 id="quizzes-heading" className={sectionHeading}>
        Topic quiz attempts
      </h2>
      {attempts.length === 0 ? (
        <p className="mt-3 text-sm text-taupe dark:text-sand/70">No topic quizzes taken in this attempt.</p>
      ) : (
        <div className={`${card} mt-4 overflow-x-auto`}>
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-taupe dark:text-sand/60">
              <tr className="border-b border-sand dark:border-cocoa">
                <th scope="col" className="px-5 py-3 font-medium">Topic</th>
                <th scope="col" className="px-3 py-3 font-medium">Try</th>
                <th scope="col" className="px-3 py-3 font-medium">Score</th>
                <th scope="col" className="px-5 py-3 font-medium">Finished</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand dark:divide-cocoa">
              {attempts.map((a) => (
                <tr key={a.id}>
                  <td className="px-5 py-3 text-ink dark:text-cream">
                    {a.topicTitle} <span className="text-taupe dark:text-sand/60">· phase {a.phasePosition}</span>
                  </td>
                  <td className="px-3 py-3 tabular-nums text-ink dark:text-cream">#{a.attemptNumber}</td>
                  <td className="px-3 py-3">
                    <ScorePill score={a.scorePercent} passed={a.passed} />
                  </td>
                  <td className="px-5 py-3 text-taupe dark:text-sand/70">{a.finishedAt ? historyDateTime.format(a.finishedAt) : 'Unfinished'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function AssessmentHistory({ attempts }: { attempts: AttemptDetail['assessmentAttempts'] }) {
  return (
    <section aria-labelledby="assessments-heading">
      <h2 id="assessments-heading" className={sectionHeading}>
        Phase assessment attempts
      </h2>
      {attempts.length === 0 ? (
        <p className="mt-3 text-sm text-taupe dark:text-sand/70">No phase assessments taken in this attempt.</p>
      ) : (
        <div className={`${card} mt-4 overflow-x-auto`}>
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-taupe dark:text-sand/60">
              <tr className="border-b border-sand dark:border-cocoa">
                <th scope="col" className="px-5 py-3 font-medium">Phase</th>
                <th scope="col" className="px-3 py-3 font-medium">Try</th>
                <th scope="col" className="px-3 py-3 font-medium">Score</th>
                <th scope="col" className="px-5 py-3 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand dark:divide-cocoa">
              {attempts.map((a) => (
                <tr key={a.id}>
                  <td className="px-5 py-3 text-ink dark:text-cream">
                    Phase {a.phasePosition}: {a.phaseTitle}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-ink dark:text-cream">#{a.attemptNumber}</td>
                  <td className="px-3 py-3">
                    <ScorePill score={a.scorePercent} passed={a.passed} />
                    <span className="ml-2 text-xs tabular-nums text-taupe dark:text-sand/60">
                      {a.correctCount}/{a.totalQuestions}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-taupe dark:text-sand/70">{historyDateTime.format(a.submittedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function BadgeHistory({ badges }: { badges: AttemptDetail['badges'] }) {
  return (
    <section aria-labelledby="badges-heading" className="lg:sticky lg:top-28 lg:self-start">
      <h2 id="badges-heading" className={sectionHeading}>
        Badges earned
      </h2>
      {badges.length === 0 ? (
        <p className="mt-3 text-sm text-taupe dark:text-sand/70">No badges earned in this attempt.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {badges.map((b) => (
            <li key={b.awardId} className="flex items-center gap-3 rounded-2xl border border-sand p-3 dark:border-cocoa">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-soft to-gold text-espresso">
                <Icon icon={b.icon} width={22} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="font-medium text-ink dark:text-cream">{b.title}</p>
                <p className="text-xs text-taupe dark:text-sand/60">{historyDate.format(b.earnedAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Link href={LEARNER_ROUTES.achievements} className="mt-4 inline-flex items-center gap-1.5 text-sm text-taupe hover:text-ink dark:text-sand/70 dark:hover:text-cream">
        All achievements
        <Icon icon="solar:arrow-right-linear" width={15} aria-hidden="true" />
      </Link>
    </section>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-taupe dark:text-sand/60">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums text-ink dark:text-cream">{value}</dd>
    </div>
  )
}
