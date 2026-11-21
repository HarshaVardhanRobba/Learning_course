import Link from 'next/link'
import { Icon } from '@iconify/react'
import { getLearnerDashboard, type DashboardCourse, type EarnedBadge, type HistoryEvent } from '@workspace/core'
import { ProfileButton } from '@/components/learner/profile-button'
import {
  AttemptSummary,
  CourseActions,
  PreviousAttempts,
  ProgressBar,
  StatusPill,
  card,
  dateFormat,
} from '@/components/learner/course-progress'
import { requireApprovedLearner } from '@/lib/learner'
import { LEARNER_ROUTES } from '@/lib/routes'

export const metadata = { title: 'Learner dashboard' }

const sectionHeading = 'font-display text-3xl font-semibold tracking-tight text-ink dark:text-cream'
const sectionLink =
  'inline-flex items-center gap-1.5 text-sm text-taupe transition-colors duration-150 hover:text-ink dark:text-sand/70 dark:hover:text-cream'

export default async function LearnerDashboardPage() {
  // Clerk session -> app user -> approved application in Neon; pending/rejected applicants are redirected.
  const { user, application } = await requireApprovedLearner()
  const dashboard = await getLearnerDashboard(user.id)

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-20 pt-8">
      <section
        aria-labelledby="welcome-heading"
        className="flex flex-wrap items-end justify-between gap-4 border-b border-sand pb-6 dark:border-cocoa"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Learner dashboard</p>
          <h1
            id="welcome-heading"
            className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl dark:text-cream"
          >
            Welcome back, {application.firstName}.
          </h1>
          <p className="mt-2 max-w-xl text-taupe dark:text-sand/70">
            {dashboard.foundationComplete
              ? 'Foundation done. Pick a career path and keep building.'
              : 'Finish the Common Foundation to unlock every career path.'}
          </p>
        </div>
        <ProfileButton className="inline-flex items-center gap-2 rounded-full border border-sand px-5 py-2.5 text-sm font-medium text-ink transition-colors duration-150 hover:bg-sand/50 dark:border-cocoa dark:text-cream dark:hover:bg-cocoa" />
      </section>

      <FoundationSection course={dashboard.foundation} />
      <CareerPathsSection courses={dashboard.careerPaths} foundationComplete={dashboard.foundationComplete} />

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <AchievementsSection badges={dashboard.recentBadges} />
        <HistorySection events={dashboard.history} />
      </div>
    </main>
  )
}

function FoundationSection({ course }: { course: DashboardCourse | null }) {
  if (!course) {
    return (
      <section aria-label="Common Foundation" className={`${card} mt-8 px-6 py-10 text-center text-taupe dark:text-sand/70`}>
        The Common Foundation isn’t published yet. Check back soon.
      </section>
    )
  }

  const attempt = course.currentAttempt
  return (
    <section aria-labelledby="foundation-heading" className={`${card} mt-8 space-y-5 p-6 sm:p-8`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Common Foundation</p>
          <h2 id="foundation-heading" className={`mt-1 ${sectionHeading}`}>
            {course.title}
          </h2>
          {course.summary && <p className="mt-2 max-w-2xl text-taupe dark:text-sand/70">{course.summary}</p>}
        </div>
        <StatusPill status={course.status} />
      </div>

      {attempt ? (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-4">
            <AttemptSummary attempt={attempt} />
            <p className="font-display text-3xl font-semibold tabular-nums text-ink dark:text-cream">{attempt.percent}%</p>
          </div>
          <ProgressBar percent={attempt.percent} label={`${course.title} progress`} />
          {attempt.status === 'in_progress' && attempt.nextTopic && (
            <p className="text-sm text-taupe dark:text-sand/70">
              Up next: <span className="font-medium text-ink dark:text-cream">{attempt.nextTopic.title}</span> in{' '}
              {attempt.nextTopic.phaseTitle}
            </p>
          )}
          {course.attempts.length > 1 && (
            <p className="text-xs text-taupe dark:text-sand/60">
              Attempt #{attempt.attemptNumber} · v{attempt.version}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-taupe dark:text-sand/70">You haven’t started yet. It’s the first step for everyone.</p>
      )}

      <CourseActions course={course} />
      <PreviousAttempts course={course} />
    </section>
  )
}

function CareerPathsSection({ courses, foundationComplete }: { courses: DashboardCourse[]; foundationComplete: boolean }) {
  return (
    <section aria-labelledby="paths-heading" className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="paths-heading" className={sectionHeading}>
          Career paths
        </h2>
        {!foundationComplete && (
          <p className="flex items-center gap-1.5 text-sm text-taupe dark:text-sand/70">
            <Icon icon="solar:lock-keyhole-minimalistic-linear" width={15} aria-hidden="true" />
            Locked until the foundation is complete
          </p>
        )}
      </div>

      {courses.length === 0 ? (
        <p className="mt-5 rounded-[1.75rem] border border-dashed border-sand px-6 py-12 text-center text-taupe dark:border-cocoa dark:text-sand/70">
          No career paths are published yet.
        </p>
      ) : (
        <ul className="mt-5 grid gap-5 md:grid-cols-2">
          {courses.map((course) => (
            <CareerPathCard key={course.courseId} course={course} />
          ))}
        </ul>
      )}
    </section>
  )
}

function CareerPathCard({ course }: { course: DashboardCourse }) {
  const attempt = course.currentAttempt
  return (
    <li className={`${card} flex flex-col gap-4 p-6 ${course.locked ? 'opacity-80' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-2xl font-semibold text-ink dark:text-cream">{course.title}</h3>
        <StatusPill status={course.status} locked={course.locked} />
      </div>
      {course.summary && <p className="text-sm leading-relaxed text-taupe dark:text-sand/70">{course.summary}</p>}

      {attempt && (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm text-taupe dark:text-sand/70">
              {attempt.status === 'in_progress' ? 'Current' : 'Latest'} attempt #{attempt.attemptNumber} · v{attempt.version}
            </p>
            <p className="text-lg font-semibold tabular-nums text-ink dark:text-cream">{attempt.percent}%</p>
          </div>
          <ProgressBar percent={attempt.percent} label={`${course.title} progress`} />
          <AttemptSummary attempt={attempt} />
        </div>
      )}

      <div className="mt-auto space-y-4">
        <CourseActions course={course} />
        <PreviousAttempts course={course} />
      </div>
    </li>
  )
}

function AchievementsSection({ badges }: { badges: EarnedBadge[] }) {
  return (
    <section aria-labelledby="achievements-heading" className={`${card} p-6 sm:p-8`}>
      <div className="flex items-center justify-between gap-4">
        <h2 id="achievements-heading" className={sectionHeading}>
          Achievements
        </h2>
        <Link href={LEARNER_ROUTES.achievements} className={sectionLink}>
          View all
          <Icon icon="solar:arrow-right-linear" width={15} />
        </Link>
      </div>
      {badges.length === 0 ? (
        <p className="mt-5 text-sm text-taupe dark:text-sand/70">No badges yet. Complete topics and phases to earn your first.</p>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {badges.map((badge) => (
            <li key={badge.id} className="flex items-center gap-3 rounded-2xl border border-sand p-3 dark:border-cocoa">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold">
                <Icon icon={badge.icon} width={22} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-ink dark:text-cream">{badge.title}</p>
                <p className="text-xs text-taupe dark:text-sand/60">
                  Earned <time dateTime={badge.earnedAt.toISOString()}>{dateFormat.format(badge.earnedAt)}</time>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const HISTORY_ICON: Record<HistoryEvent['kind'], { icon: string; verb: string }> = {
  started: { icon: 'solar:play-circle-linear', verb: 'Started' },
  completed: { icon: 'solar:check-circle-linear', verb: 'Completed' },
  abandoned: { icon: 'solar:restart-linear', verb: 'Replaced' },
}

function HistorySection({ events }: { events: HistoryEvent[] }) {
  return (
    <section aria-labelledby="history-heading" className={`${card} p-6 sm:p-8`}>
      <div className="flex items-center justify-between gap-4">
        <h2 id="history-heading" className={sectionHeading}>
          Learning history
        </h2>
        <Link href={LEARNER_ROUTES.history} className={sectionLink}>
          View all
          <Icon icon="solar:arrow-right-linear" width={15} />
        </Link>
      </div>
      {events.length === 0 ? (
        <p className="mt-5 text-sm text-taupe dark:text-sand/70">Your enrollment activity will show up here.</p>
      ) : (
        <ol className="mt-5 space-y-3">
          {events.map((event) => {
            const meta = HISTORY_ICON[event.kind]
            return (
              <li key={event.id} className="flex items-start gap-3 text-sm">
                <Icon icon={meta.icon} width={18} aria-hidden="true" className="mt-0.5 shrink-0 text-gold" />
                <div className="min-w-0 flex-1">
                  <p className="text-ink dark:text-cream">
                    {meta.verb} <span className="font-medium">{event.courseTitle}</span>
                    <span className="text-taupe dark:text-sand/60"> · attempt #{event.attemptNumber}</span>
                  </p>
                  <time dateTime={event.at.toISOString()} className="text-xs text-taupe dark:text-sand/60">
                    {dateFormat.format(event.at)}
                  </time>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
