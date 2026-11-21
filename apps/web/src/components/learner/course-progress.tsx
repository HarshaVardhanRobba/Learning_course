import Link from 'next/link'
import { Icon } from '@iconify/react'
import type { AttemptProgress, DashboardCourse, LearningStatus } from '@workspace/core'
import type { EnrollmentStatus } from '@workspace/db'
import { startAttemptAction } from '@/app/(learner)/learner/dashboard/actions'
import { LEARNER_ROUTES } from '@/lib/routes'
import { darkPill } from '@/lib/styles'

export const card = 'rounded-[1.75rem] border border-sand bg-white/70 dark:border-cocoa dark:bg-cocoa/40'

export const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' })

const STATUS_PILL: Record<LearningStatus, { label: string; className: string }> = {
  not_started: { label: 'Not started', className: 'bg-sand/70 text-taupe dark:bg-cocoa dark:text-sand/70' },
  in_progress: { label: 'In progress', className: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' },
}

const ATTEMPT_LABEL: Record<EnrollmentStatus, string> = {
  in_progress: 'In progress',
  completed: 'Completed',
  abandoned: 'Replaced',
}

export function StatusPill({ status, locked }: { status: LearningStatus; locked?: boolean }) {
  if (locked) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sand/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-taupe dark:bg-cocoa dark:text-sand/70">
        <Icon icon="solar:lock-keyhole-minimalistic-linear" width={13} aria-hidden="true" />
        Locked
      </span>
    )
  }
  const pill = STATUS_PILL[status]
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${pill.className}`}>
      {pill.label}
    </span>
  )
}

export function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-2 w-full overflow-hidden rounded-full bg-sand/70 dark:bg-cocoa"
    >
      <div className="h-full rounded-full bg-gold transition-[width] duration-500 ease-out" style={{ width: `${percent}%` }} />
    </div>
  )
}

export function AttemptSummary({ attempt }: { attempt: AttemptProgress }) {
  return (
    <p className="text-sm text-taupe dark:text-sand/70">
      {attempt.completedTopics} of {attempt.totalTopics} topics · {attempt.completedPhases} of {attempt.totalPhases} phases
    </p>
  )
}

function StartForm({ courseId, label, replace = false }: { courseId: string; label: string; replace?: boolean }) {
  return (
    <form action={startAttemptAction}>
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="replaceInProgress" value={replace ? '1' : '0'} />
      <button type="submit" className={replace ? secondaryButton : darkPill}>
        {!replace && <Icon icon="solar:play-linear" width={16} />}
        {label}
      </button>
    </form>
  )
}

const secondaryButton =
  'inline-flex items-center gap-2 rounded-full border border-sand px-5 py-2.5 text-sm font-medium text-ink transition-[background-color,transform] duration-150 ease-out hover:bg-sand/50 active:scale-[0.97] dark:border-cocoa dark:text-cream dark:hover:bg-cocoa'

/** Continue / start / new-attempt controls. Every option is re-checked on the server by `startAttempt`. */
export function CourseActions({ course }: { course: DashboardCourse }) {
  const attempt = course.currentAttempt
  const live = attempt?.status === 'in_progress' ? attempt : null

  if (course.locked) {
    return (
      <p className="flex items-center gap-2 text-sm text-taupe dark:text-sand/70">
        <Icon icon="solar:lock-keyhole-minimalistic-linear" width={16} aria-hidden="true" />
        Unlocks when you complete the Common Foundation.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-start gap-3">
      {live ? (
        <Link
          href={course.kind === 'foundation' ? LEARNER_ROUTES.foundation : LEARNER_ROUTES.track(course.slug)}
          className={darkPill}
        >
          {live.isComplete ? 'Review course' : 'Continue learning'}
          <Icon icon="solar:arrow-right-linear" width={16} />
        </Link>
      ) : (
        <>
          {course.canStart && (
            <StartForm courseId={course.courseId} label={course.attempts.length ? 'Start a new attempt' : 'Start learning'} />
          )}
          {course.attempts.length > 0 && (
            <Link
              href={course.kind === 'foundation' ? LEARNER_ROUTES.foundation : LEARNER_ROUTES.track(course.slug)}
              className={secondaryButton}
            >
              <Icon icon="solar:map-linear" width={16} />
              View map
            </Link>
          )}
        </>
      )}

      {course.canRestart && (
        <details className="group">
          <summary className={`${secondaryButton} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
            <Icon icon="solar:restart-linear" width={16} />
            Start over…
          </summary>
          <div className="mt-3 max-w-sm space-y-3 rounded-2xl border border-sand p-4 text-sm dark:border-cocoa">
            <p className="text-taupe dark:text-sand/70">
              This begins attempt #{course.attempts.length + 1} from the start. Your current attempt and its progress
              stay in your history.
            </p>
            <StartForm courseId={course.courseId} label="Confirm new attempt" replace />
          </div>
        </details>
      )}
    </div>
  )
}

export function PreviousAttempts({ course }: { course: DashboardCourse }) {
  const previous = course.attempts.filter((a) => a.enrollmentId !== course.currentAttempt?.enrollmentId)
  if (!previous.length) return null

  return (
    <details className="group border-t border-sand pt-4 dark:border-cocoa">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm text-taupe hover:text-ink dark:text-sand/70 dark:hover:text-cream [&::-webkit-details-marker]:hidden">
        <Icon icon="solar:alt-arrow-right-linear" width={14} className="transition-transform duration-150 group-open:rotate-90" />
        {previous.length} previous {previous.length === 1 ? 'attempt' : 'attempts'}
      </summary>
      <ul className="mt-3 space-y-2">
        {previous.map((a) => (
          <li key={a.enrollmentId} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-ink dark:text-cream">
              Attempt #{a.attemptNumber}
              <span className="text-taupe dark:text-sand/60"> · v{a.version} · started {dateFormat.format(a.startedAt)}</span>
            </span>
            <span className="tabular-nums text-taupe dark:text-sand/70">
              {a.percent}% · {ATTEMPT_LABEL[a.status]}
            </span>
          </li>
        ))}
      </ul>
    </details>
  )
}
