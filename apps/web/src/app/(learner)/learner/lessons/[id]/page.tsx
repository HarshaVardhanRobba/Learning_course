import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Icon } from '@iconify/react'
import { attemptNumberSchema, lessonIdSchema, type LessonView } from '@workspace/core'
import { completeLessonByIdAction, completeTopicAction } from '../../learning-actions'
import { CourseSidebar, formatDuration } from '@/components/learner/lesson/course-sidebar'
import { LessonContent } from '@/components/learner/lesson/lesson-content'
import { LessonTabs } from '@/components/learner/lesson/lesson-tabs'
import { VideoStage } from '@/components/learner/lesson/video-stage'
import { StatePill } from '@/components/learner/learning-map'
import { card } from '@/components/learner/course-progress'
import { requireApprovedLearner } from '@/lib/learner'
import { LEARNER_ROUTES, courseRoutes } from '@/lib/routes'
import { darkPill } from '@/lib/styles'
import { caller } from '@/trpc/server'

export const metadata = { title: 'Lesson' }

type Shown = Extract<LessonView, { kind: 'lesson' }>

const secondaryButton =
  'inline-flex items-center gap-2 rounded-full border border-sand px-5 py-2.5 text-sm font-medium text-ink transition-[background-color,transform] duration-150 ease-out hover:bg-sand/50 active:scale-[0.97] dark:border-cocoa dark:text-cream dark:hover:bg-cocoa'

export default async function LessonPage({ params, searchParams }: PageProps<'/learner/lessons/[id]'>) {
  // Clerk session -> app user -> approved application in Neon. The lesson must belong to the version of
  // one of this learner's own attempts and sit in an unlocked topic; everything else is denied.
  await requireApprovedLearner()
  const id = lessonIdSchema.safeParse((await params).id)
  if (!id.success) notFound()

  const raw = (await searchParams).attempt
  const attempt = raw === undefined ? undefined : attemptNumberSchema.safeParse(raw)
  if (attempt && !attempt.success) notFound()

  const view = await caller.learner.lesson({ lessonId: id.data, attempt: attempt?.data })
  if (view.kind === 'not_found') notFound()
  if (view.kind === 'locked') return <LockedLesson view={view} />

  const routes = courseRoutes(view.course)
  const lessonHref = (lessonId: string) => LEARNER_ROUTES.lesson(lessonId, view.attemptParam)
  const mapHref = routes.map(view.attemptParam)

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
      <div className="min-w-0">
        <TopBar view={view} mapHref={mapHref} />
        <VideoStage title={view.lesson.title} video={view.video} previous={view.previous} next={view.next} hrefFor={lessonHref} />
        <LessonTabs
          tabs={[
            { id: 'overview', label: 'Overview', content: <Overview view={view} lessonHref={lessonHref} mapHref={mapHref} /> },
            {
              id: 'resources',
              label: `Resources${view.resources.length ? ` (${view.resources.length})` : ''}`,
              content: <Resources view={view} />,
            },
          ]}
        />
      </div>
      <CourseSidebar
        map={view.map}
        currentLessonId={view.lesson.id}
        currentTopicId={view.topic.id}
        editable={view.editable}
        quizIds={view.quizIds}
        lessonHref={lessonHref}
        quizHref={(quizId) => LEARNER_ROUTES.quiz(quizId, view.attemptParam)}
        assessmentHref={(assessmentId) => LEARNER_ROUTES.assessment(assessmentId, view.attemptParam)}
      />
    </div>
  )
}

function TopBar({ view, mapHref }: { view: Shown; mapHref: string }) {
  const { map } = view
  const r = 15
  const circumference = 2 * Math.PI * r
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-ink px-4 py-3 sm:px-6 sm:py-3.5 text-cream dark:bg-black/60">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <Link
          href={mapHref}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-cream/25 px-3.5 py-1.5 text-sm transition-colors duration-150 hover:bg-cream/10"
        >
          <Icon icon="solar:map-linear" width={16} aria-hidden="true" />
          Map
        </Link>
        <span aria-hidden="true" className="h-6 w-px bg-cream/20" />
        <p className="min-w-0 truncate text-sm sm:text-base">{view.course.title}</p>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <svg viewBox="0 0 36 36" className="size-9 -rotate-90" aria-hidden="true">
          <circle cx="18" cy="18" r={r} fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
          <circle
            cx="18"
            cy="18"
            r={r}
            fill="none"
            stroke="var(--color-gold)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - map.percent / 100)}
          />
        </svg>
        <span>
          Your progress <span className="tabular-nums text-gold-soft">{map.percent}%</span>
          <span className="hidden text-cream/60 sm:inline">
            {' '}
            · {map.completedTopics}/{map.totalTopics} topics · attempt #{view.attempt.attemptNumber}
          </span>
        </span>
      </div>
    </div>
  )
}

function Overview({ view, lessonHref, mapHref }: { view: Shown; lessonHref: (id: string) => string; mapHref: string }) {
  const { lesson, topic, phase, course, editable } = view
  const duration = formatDuration(lesson.durationSeconds)
  const next = view.next && !view.next.locked ? view.next : null
  const previous = view.previous && !view.previous.locked ? view.previous : null

  return (
    <div className="px-4 pb-16 pt-6 sm:px-10 sm:pb-20 sm:pt-8">
      <div className="mx-auto max-w-3xl">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-taupe dark:text-sand/70">
          <Link href={mapHref} className="hover:text-ink dark:hover:text-cream">
            {course.title}
          </Link>
          <Icon icon="solar:alt-arrow-right-linear" width={12} aria-hidden="true" />
          <span>
            Phase {phase.position}: {phase.title}
          </span>
          <Icon icon="solar:alt-arrow-right-linear" width={12} aria-hidden="true" />
          <span aria-current="page" className="text-ink dark:text-cream">
            {topic.title}
          </span>
        </nav>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <h1 className="min-w-0 break-words font-display text-3xl font-semibold leading-tight sm:text-4xl tracking-tight text-ink dark:text-cream">{lesson.title}</h1>
          {lesson.done && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
              <Icon icon="lucide:check" width={13} strokeWidth={3} aria-hidden="true" />
              Completed
            </span>
          )}
        </div>
        {duration && <p className="mt-2 text-sm text-taupe dark:text-sand/70">{duration}</p>}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <PrimaryAction view={view} next={next} lessonHref={lessonHref} mapHref={mapHref} />
          {previous && (
            <Link href={lessonHref(previous.id)} className={secondaryButton}>
              <Icon icon="lucide:chevron-left" width={16} aria-hidden="true" />
              Previous lesson
            </Link>
          )}
          {next && (lesson.done || !editable) && (
            <Link href={lessonHref(next.id)} className={secondaryButton}>
              Next lesson
              <Icon icon="lucide:chevron-right" width={16} aria-hidden="true" />
            </Link>
          )}
        </div>
        {!editable && (
          <p className="mt-4 text-sm text-taupe dark:text-sand/70">
            You’re viewing attempt #{view.attempt.attemptNumber} ({view.attempt.status === 'completed' ? 'completed' : 'replaced'}),
            read-only.
          </p>
        )}

        <div className="mt-10">
          {lesson.content.trim() ? (
            <LessonContent content={lesson.content} format={lesson.contentFormat} />
          ) : (
            <p className="rounded-2xl border border-dashed border-sand px-5 py-6 text-sm text-taupe dark:border-cocoa dark:text-sand/70">
              Detailed material for this lesson is on its way. For now, study it using the topic’s learning goals below.
            </p>
          )}
        </div>
      </div>

      <div className="mx-auto mt-12 max-w-5xl border-t border-sand dark:border-cocoa">
        <InfoRow label="By the numbers">
          <dl className="grid gap-x-12 gap-y-2 sm:grid-cols-2">
            <Stat label="Phase" value={`${phase.position}: ${phase.title}`} />
            <Stat label="Lessons in topic" value={String(topic.lessonCount)} />
            <Stat label="Lessons covered" value={`${topic.lessonsDone} of ${topic.lessonCount}`} />
            <Stat label="Course progress" value={`${view.map.percent}%`} />
          </dl>
        </InfoRow>

        <InfoRow label="Topic quiz" id="topic-quiz">
          <TopicQuiz view={view} />
        </InfoRow>

        {topic.description && (
          <InfoRow label="What to learn">
            <p className="leading-relaxed text-ink dark:text-cream/90">{topic.description}</p>
          </InfoRow>
        )}

        <InfoRow label="Topic status">
          <StatePill state={topic.state} />
        </InfoRow>
      </div>
    </div>
  )
}

function PrimaryAction({
  view,
  next,
  lessonHref,
  mapHref,
}: {
  view: Shown
  next: { id: string; title: string } | null
  lessonHref: (id: string) => string
  mapHref: string
}) {
  if (!view.editable) return null

  // Opening a lesson never completes it; the learner marks it explicitly.
  if (!view.lesson.done) {
    return (
      <form action={completeLessonByIdAction}>
        <input type="hidden" name="lessonId" value={view.lesson.id} />
        <button type="submit" className={darkPill}>
          <Icon icon="solar:check-circle-linear" width={16} aria-hidden="true" />
          Mark as completed
        </button>
      </form>
    )
  }

  if (view.quiz.state === 'available') {
    return (
      <a href={view.quiz.quizId ? LEARNER_ROUTES.quiz(view.quiz.quizId) : '#topic-quiz'} className={darkPill}>
        Continue to topic quiz
        <Icon icon="solar:arrow-down-linear" width={16} aria-hidden="true" />
      </a>
    )
  }

  return (
    <Link href={next ? lessonHref(next.id) : mapHref} className={darkPill}>
      Continue
      <Icon icon="solar:arrow-right-linear" width={16} aria-hidden="true" />
    </Link>
  )
}

function TopicQuiz({ view }: { view: Shown }) {
  const quizHref = view.quiz.quizId ? LEARNER_ROUTES.quiz(view.quiz.quizId, view.attemptParam) : null
  if (view.quiz.state === 'passed') {
    return (
      <div>
        <p className="text-emerald-800 dark:text-emerald-300">Passed. This topic is complete.</p>
        {quizHref && (
          <Link href={quizHref} className={`${secondaryButton} mt-4`}>
            <Icon icon="solar:history-linear" width={16} aria-hidden="true" />
            View quiz history
          </Link>
        )}
      </div>
    )
  }
  if (view.quiz.state === 'locked') {
    return (
      <p className="text-taupe dark:text-sand/70">
        Unlocks once every lesson in “{view.topic.title}” is completed ({view.topic.lessonsDone} of {view.topic.lessonCount} so far).
      </p>
    )
  }
  if (quizHref) {
    return (
      <div>
        <p className="text-taupe dark:text-sand/70">Every lesson is covered. Pass the quiz with 100% to complete this topic; retries are unlimited.</p>
        <Link href={quizHref} className={`${darkPill} mt-4`}>
          <Icon icon="solar:clipboard-check-linear" width={16} aria-hidden="true" />
          Take the topic quiz
        </Link>
      </div>
    )
  }
  return (
    <div>
      <p className="text-taupe dark:text-sand/70">
        Every lesson is covered. This topic has no quiz yet, so completing it here moves you along the map.
      </p>
      {view.editable && (
        <form action={completeTopicAction} className="mt-4">
          <input type="hidden" name="courseId" value={view.course.id} />
          <input type="hidden" name="topicId" value={view.topic.id} />
          <button type="submit" className={darkPill}>
            <Icon icon="solar:clipboard-check-linear" width={16} aria-hidden="true" />
            Complete topic
          </button>
        </form>
      )}
    </div>
  )
}

function Resources({ view }: { view: Shown }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-10 sm:pb-20 sm:pt-8">
      {view.resources.length === 0 ? (
        <p className="text-sm text-taupe dark:text-sand/70">No external resources for this lesson yet.</p>
      ) : (
        <ul className="space-y-3">
          {view.resources.map((resource) => (
            <li key={resource.id}>
              {/* Opens through the access-checked endpoint; files are shown inline, never offered as downloads. */}
              <a
                href={LEARNER_ROUTES.resource(resource.id)}
                target="_blank"
                rel="noopener noreferrer"
                className={`${card} flex items-center gap-4 p-4 transition-colors duration-150 hover:border-gold`}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold">
                  <Icon icon={resource.kind === 'file' ? 'solar:document-text-linear' : 'solar:link-round-angle-linear'} width={20} aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 font-medium text-ink dark:text-cream">{resource.title}</span>
                <Icon icon="solar:arrow-right-up-linear" width={18} aria-hidden="true" className="text-taupe" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function InfoRow({ label, id, children }: { label: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="grid scroll-mt-28 gap-3 border-b border-sand py-6 sm:py-7 md:grid-cols-[200px_minmax(0,1fr)] lg:grid-cols-[220px_minmax(0,1fr)] dark:border-cocoa">
      <h2 className="text-base text-ink dark:text-cream">{label}</h2>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-ink dark:text-cream/90">
      <dt>{label}:</dt>
      <dd className="min-w-0 break-words font-medium">{value}</dd>
    </div>
  )
}

function LockedLesson({ view }: { view: Extract<LessonView, { kind: 'locked' }> }) {
  const mapHref = courseRoutes(view.course).map()
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8 sm:px-6">
      <section className={`${card} mt-6 px-5 py-10 text-center sm:px-6 sm:py-12`}>
        <span className="mx-auto grid size-20 place-items-center rounded-full bg-sand/60 text-taupe dark:bg-cocoa dark:text-sand/70">
          <Icon icon="solar:lock-keyhole-minimalistic-linear" width={34} />
        </span>
        <h1 className="mt-6 break-words font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl dark:text-cream">{view.lessonTitle} is locked</h1>
        <p className="mx-auto mt-3 max-w-md text-taupe dark:text-sand/70">{view.reason}</p>
        <Link href={mapHref} className={`${darkPill} mt-7 px-6 py-3`}>
          <Icon icon="solar:map-linear" width={16} />
          Back to {view.course.title}
        </Link>
      </section>
    </main>
  )
}
