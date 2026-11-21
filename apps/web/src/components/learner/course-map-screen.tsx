import Link from 'next/link'
import { Icon } from '@iconify/react'
import type { CourseHeader, CourseMapView, MapPhase } from '@workspace/core'
import { PhaseMap, StatePill } from './learning-map'
import { ProgressBar, card, dateFormat } from './course-progress'
import { startCourseAttemptAction } from '@/app/(learner)/learner/learning-actions'
import { LEARNER_ROUTES, courseRoutes } from '@/lib/routes'
import { darkPill } from '@/lib/styles'

const backLink =
  'inline-flex items-center gap-1.5 text-sm text-taupe transition-colors duration-150 hover:text-ink dark:text-sand/70 dark:hover:text-cream'
const secondaryButton =
  'inline-flex items-center gap-2 rounded-full border border-sand px-5 py-2.5 text-sm font-medium text-ink transition-[background-color,transform] duration-150 ease-out hover:bg-sand/50 active:scale-[0.97] dark:border-cocoa dark:text-cream dark:hover:bg-cocoa'

type ShownView = Exclude<CourseMapView, { kind: 'not_found' }>

/** The learning map for the foundation or a track. Every state on it was computed on the server. */
export function CourseMapScreen({ view, justCompleted }: { view: ShownView; justCompleted: boolean }) {
  const { course } = view
  return (
    <main className="mx-auto w-full max-w-4xl px-6 pb-24 pt-8">
      <Link href={LEARNER_ROUTES.dashboard} className={backLink}>
        <Icon icon="solar:arrow-left-linear" width={16} />
        Back to dashboard
      </Link>

      <header className="mt-6 border-b border-sand pb-6 dark:border-cocoa">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
          {course.kind === 'foundation' ? 'Learning map' : `${course.stream?.title ?? 'Track'} stream`}
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl dark:text-cream">
            {view.kind === 'map' ? view.attempt.versionTitle : course.title}
          </h1>
          {view.kind === 'map' && (
            <p className="font-display text-4xl font-semibold tabular-nums text-ink dark:text-cream">{view.map.percent}%</p>
          )}
        </div>
        {course.summary && <p className="mt-3 max-w-2xl leading-relaxed text-taupe dark:text-sand/70">{course.summary}</p>}
        {view.kind === 'map' && (
          <>
            <div className="mt-5">
              <ProgressBar percent={view.map.percent} label={`${course.title} progress`} />
            </div>
            <p className="mt-2 text-sm text-taupe dark:text-sand/70">
              {view.map.completedTopics} of {view.map.totalTopics} topics ·{' '}
              {view.map.phases.filter((p) => p.state === 'completed').length} of {view.map.phases.length} phases
            </p>
          </>
        )}
      </header>

      {view.kind === 'locked' && <LockedCourse reason={view.reason} />}
      {view.kind === 'not_started' && <NotStarted course={course} />}
      {view.kind === 'map' && <MapBody view={view} justCompleted={justCompleted} />}
    </main>
  )
}

function LockedCourse({ reason }: { reason: string }) {
  return (
    <section className={`${card} mt-8 px-6 py-12 text-center`}>
      <span className="mx-auto grid size-20 place-items-center rounded-full bg-sand/60 text-taupe dark:bg-cocoa dark:text-sand/70">
        <Icon icon="solar:lock-keyhole-minimalistic-linear" width={34} />
      </span>
      <h2 className="mt-6 font-display text-3xl font-semibold tracking-tight text-ink dark:text-cream">This track is locked</h2>
      <p className="mx-auto mt-3 max-w-md text-taupe dark:text-sand/70">{reason}</p>
      <Link href={LEARNER_ROUTES.foundation} className={`${darkPill} mt-7 px-6 py-3`}>
        <Icon icon="solar:map-linear" width={16} />
        Go to the Common Foundation
      </Link>
    </section>
  )
}

function StartForm({ course, label, replace = false }: { course: CourseHeader; label: string; replace?: boolean }) {
  return (
    <form action={startCourseAttemptAction}>
      <input type="hidden" name="courseId" value={course.courseId} />
      <input type="hidden" name="kind" value={course.kind} />
      <input type="hidden" name="slug" value={course.slug} />
      <input type="hidden" name="replaceInProgress" value={replace ? '1' : '0'} />
      <button type="submit" className={replace ? secondaryButton : `${darkPill} px-6 py-3`}>
        {!replace && <Icon icon="solar:play-linear" width={16} />}
        {label}
      </button>
    </form>
  )
}

function NotStarted({ course }: { course: CourseHeader }) {
  return (
    <section className={`${card} mt-8 px-6 py-12 text-center`}>
      <span className="mx-auto grid size-20 place-items-center rounded-full bg-gold/15 text-gold">
        <Icon icon="solar:map-point-wave-linear" width={36} />
      </span>
      <h2 className="mt-6 font-display text-3xl font-semibold tracking-tight text-ink dark:text-cream">Ready when you are</h2>
      <p className="mx-auto mt-3 max-w-md text-taupe dark:text-sand/70">
        Start your first attempt to open the map. Phases unlock one after another; topics inside a phase can be done in any order.
      </p>
      <div className="mt-7 flex justify-center">
        <StartForm course={course} label={course.kind === 'foundation' ? 'Start the foundation' : 'Start this track'} />
      </div>
    </section>
  )
}

function MapBody({ view, justCompleted }: { view: Extract<ShownView, { kind: 'map' }>; justCompleted: boolean }) {
  const { course, attempt, map } = view
  const routes = courseRoutes(course)
  // Links from a past attempt keep pointing at that attempt so its progress is never mixed with another.
  const attemptParam = view.editable ? undefined : attempt.attemptNumber

  return (
    <>
      <AttemptBar view={view} />

      {justCompleted && view.editable === false && map.isComplete && (
        <Banner tone="success">
          {course.kind === 'foundation' ? 'Foundation complete! Every stream is now unlocked.' : 'Track complete. Well done!'}
        </Banner>
      )}
      {justCompleted && view.editable && <Banner tone="success">Topic completed. Keep going!</Banner>}

      {!view.editable && (
        <Banner tone="neutral">
          {attempt.status === 'completed'
            ? `Attempt #${attempt.attemptNumber} is complete. Its map is shown for review.`
            : `Attempt #${attempt.attemptNumber} was replaced by a newer attempt. Its progress is kept and shown read-only.`}
        </Banner>
      )}

      {view.editable && course.latestVersion !== null && course.latestVersion > attempt.version && (
        <Banner tone="warning">
          An updated version (v{course.latestVersion}) is available. Start a new attempt to switch; this attempt stays in your
          history.
        </Banner>
      )}

      <Legend />

      <div className="mt-10">
        {map.phases.map((phase, i) => (
          <PhaseSection
            key={phase.id}
            phase={phase}
            isLast={i === map.phases.length - 1}
            readOnly={!view.editable}
            topicHref={(topicId) => routes.topic(topicId, attemptParam)}
          />
        ))}
      </div>
    </>
  )
}

function AttemptBar({ view }: { view: Extract<ShownView, { kind: 'map' }> }) {
  const { course, attempt, attempts } = view
  const routes = courseRoutes(course)
  return (
    <section aria-label="Attempts" className="mt-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-sm text-taupe dark:text-sand/70">
          Attempt <span className="font-semibold text-ink dark:text-cream">#{attempt.attemptNumber}</span> · v{attempt.version} ·
          started {dateFormat.format(attempt.startedAt)}
        </p>
        {attempts.length > 1 && (
          <nav aria-label="Switch attempt" className="mt-3 flex flex-wrap gap-2">
            {attempts.map((a) => {
              const active = a.id === attempt.id
              return (
                <Link
                  key={a.id}
                  href={routes.map(a.status === 'in_progress' ? undefined : a.attemptNumber)}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors duration-150 ${
                    active
                      ? 'border-espresso bg-espresso text-cream dark:border-cream dark:bg-cream dark:text-espresso'
                      : 'border-sand text-taupe hover:text-ink dark:border-cocoa dark:text-sand/70 dark:hover:text-cream'
                  }`}
                >
                  #{a.attemptNumber} · {a.status === 'in_progress' ? 'current' : a.status === 'completed' ? 'completed' : 'replaced'}
                </Link>
              )
            })}
          </nav>
        )}
      </div>

      <div className="flex flex-wrap items-start gap-3">
        {view.canStartNew && <StartForm course={course} label="Start new attempt" />}
        {view.canRestart && (
          <details className="group">
            <summary className={`${secondaryButton} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
              <Icon icon="solar:restart-linear" width={16} />
              Start new attempt…
            </summary>
            <div className="mt-3 max-w-xs space-y-3 rounded-2xl border border-sand p-4 text-sm dark:border-cocoa">
              <p className="text-taupe dark:text-sand/70">
                Attempt #{Math.max(...attempts.map((a) => a.attemptNumber)) + 1} starts from the beginning on the latest version.
                Your current attempt and its progress are kept.
              </p>
              <StartForm course={course} label="Confirm new attempt" replace />
            </div>
          </details>
        )}
      </div>
    </section>
  )
}

function Banner({ tone, children }: { tone: 'success' | 'neutral' | 'warning'; children: React.ReactNode }) {
  const styles = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200',
    neutral: 'border-sand text-taupe dark:border-cocoa dark:text-sand/70',
    warning: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200',
  }[tone]
  return (
    <p role={tone === 'success' ? 'status' : undefined} className={`mt-6 rounded-2xl border px-5 py-4 text-sm ${styles}`}>
      {children}
    </p>
  )
}

function PhaseSection({
  phase,
  isLast,
  readOnly,
  topicHref,
}: {
  phase: MapPhase
  isLast: boolean
  readOnly: boolean
  topicHref: (topicId: string) => string
}) {
  const headingId = `phase-${phase.id}`
  return (
    <section aria-labelledby={headingId}>
      <div className={`${card} flex flex-wrap items-center justify-between gap-3 px-6 py-5 ${phase.state === 'locked' ? 'opacity-75' : ''}`}>
        <div className="flex items-center gap-4">
          <span
            className={`grid size-12 place-items-center rounded-2xl font-display text-2xl font-semibold ${
              phase.state === 'locked' ? 'bg-sand text-taupe dark:bg-cocoa dark:text-sand/60' : 'bg-espresso text-gold-soft dark:bg-cream dark:text-espresso'
            }`}
          >
            {phase.state === 'locked' ? <Icon icon="solar:lock-keyhole-minimalistic-bold" width={20} aria-hidden="true" /> : phase.position}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-taupe dark:text-sand/60">Phase {phase.position}</p>
            <h2 id={headingId} className="font-display text-2xl font-semibold text-ink dark:text-cream">
              {phase.title}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm tabular-nums text-taupe dark:text-sand/70">
            {phase.completedTopics}/{phase.topics.length} topics
          </span>
          <StatePill state={phase.state} />
        </div>
        {phase.lockedReason && <p className="w-full text-sm text-taupe dark:text-sand/70">{phase.lockedReason}</p>}
      </div>

      <div className="py-6">
        <PhaseMap phase={phase} readOnly={readOnly} topicHref={topicHref} />
      </div>

      {!isLast && (
        <div aria-hidden="true" className="flex flex-col items-center pb-6">
          <span className="h-10 w-1.5 rounded-full bg-[repeating-linear-gradient(to_bottom,var(--color-gold)_0_6px,transparent_6px_14px)] opacity-70" />
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-sand px-3 py-1 text-xs text-taupe dark:border-cocoa dark:text-sand/70">
            <Icon icon={phase.state === 'completed' ? 'solar:lock-unlocked-linear' : 'solar:lock-keyhole-minimalistic-linear'} width={13} />
            {phase.state === 'completed' ? 'Next phase unlocked' : 'Finish this phase to continue'}
          </span>
        </div>
      )}
    </section>
  )
}

function Legend() {
  const items: { label: string; swatch: string; icon?: string }[] = [
    { label: 'Locked', swatch: 'bg-sand text-taupe dark:bg-cocoa', icon: 'solar:lock-keyhole-minimalistic-bold' },
    { label: 'Available', swatch: 'border-2 border-gold bg-white dark:bg-espresso' },
    { label: 'In progress', swatch: 'bg-espresso ring-2 ring-gold dark:bg-cream' },
    { label: 'Completed', swatch: 'bg-gold text-espresso', icon: 'lucide:check' },
  ]
  return (
    <ul aria-label="Map legend" className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-taupe dark:text-sand/70">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span className={`grid size-5 place-items-center rounded-full ${item.swatch}`}>
            {item.icon && <Icon icon={item.icon} width={11} aria-hidden="true" />}
          </span>
          {item.label}
        </li>
      ))}
    </ul>
  )
}

