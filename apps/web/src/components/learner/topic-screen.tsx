import Link from 'next/link'
import { Icon } from '@iconify/react'
import type { MapLesson, TopicView } from '@workspace/core'
import { StatePill } from './learning-map'
import { ProgressBar, card } from './course-progress'
import { completeLessonAction, completeTopicAction } from '@/app/(learner)/learner/learning-actions'
import { LEARNER_ROUTES } from '@/lib/routes'
import { darkPill } from '@/lib/styles'

const crumbLink = 'transition-colors duration-150 hover:text-ink dark:hover:text-cream'

type ShownTopic = Exclude<TopicView, { kind: 'not_found' }>

/** A topic page: its lessons and the quiz step. Locked topics only ever show the reason. */
export function TopicScreen({ view, courseTitle, mapHref }: { view: ShownTopic; courseTitle: string; mapHref: string }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 sm:px-6 sm:pt-8">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-taupe dark:text-sand/70">
        <Link href={LEARNER_ROUTES.dashboard} className={crumbLink}>
          Dashboard
        </Link>
        <Icon icon="solar:alt-arrow-right-linear" width={12} aria-hidden="true" />
        <Link href={mapHref} className={crumbLink}>
          {courseTitle}
        </Link>
        <Icon icon="solar:alt-arrow-right-linear" width={12} aria-hidden="true" />
        <span aria-current="page" className="text-ink dark:text-cream">
          {view.kind === 'locked' ? view.topicTitle : view.topic.title}
        </span>
      </nav>

      {view.kind === 'locked' ? (
        <section className={`${card} mt-6 px-5 py-10 text-center sm:px-6 sm:py-12`}>
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-sand/60 text-taupe dark:bg-cocoa dark:text-sand/70">
            <Icon icon="solar:lock-keyhole-minimalistic-linear" width={34} />
          </span>
          <h1 className="mt-6 break-words font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl dark:text-cream">{view.topicTitle} is locked</h1>
          <p className="mx-auto mt-3 max-w-md text-taupe dark:text-sand/70">{view.reason}</p>
          <Link href={mapHref} className={`${darkPill} mt-7 px-6 py-3`}>
            <Icon icon="solar:map-linear" width={16} />
            Back to the map
          </Link>
        </section>
      ) : (
        <TopicBody view={view} mapHref={mapHref} />
      )}
    </main>
  )
}

function TopicBody({ view, mapHref }: { view: Extract<ShownTopic, { kind: 'topic' }>; mapHref: string }) {
  const { topic, phase, editable, course, attempt } = view
  const total = topic.lessons.length
  const percent = total ? Math.floor((topic.lessonsDone / total) * 100) : 0

  return (
    <>
      <header className="mt-6 border-b border-sand pb-6 dark:border-cocoa">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
          Phase {phase.position} · {phase.title}
        </p>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-4">
          <h1 className="break-words font-display text-3xl font-semibold tracking-tight text-ink sm:text-5xl dark:text-cream">{topic.title}</h1>
          <StatePill state={topic.state} />
        </div>
        {!editable && (
          <p className="mt-3 text-sm text-taupe dark:text-sand/70">
            Viewing attempt #{attempt.attemptNumber} ({attempt.status === 'completed' ? 'completed' : 'replaced'}), read-only.
          </p>
        )}
        {topic.description && (
          <div className="mt-5 rounded-2xl bg-sand/40 p-5 dark:bg-cocoa/60">
            <p className="text-xs font-semibold uppercase tracking-wide text-taupe dark:text-sand/60">What to learn</p>
            <p className="mt-1.5 leading-relaxed text-ink dark:text-cream">{topic.description}</p>
          </div>
        )}
      </header>

      <section aria-labelledby="lessons-heading" className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="lessons-heading" className="font-display text-3xl font-semibold text-ink dark:text-cream">
            Lessons to cover
          </h2>
          <span className="text-sm tabular-nums text-taupe dark:text-sand/70">
            {topic.lessonsDone}/{total} covered
          </span>
        </div>
        <div className="mt-3">
          <ProgressBar percent={percent} label={`${topic.title} lessons covered`} />
        </div>

        {total === 0 ? (
          <p className="mt-5 text-sm text-taupe dark:text-sand/70">No lessons have been added to this topic yet.</p>
        ) : (
          <ol className="mt-5 space-y-3">
            {topic.lessons.map((lesson, i) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                index={i}
                courseId={course.id}
                topicId={topic.id}
                editable={editable && topic.state !== 'completed'}
              />
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="quiz-heading" className={`${card} mt-10 p-6 sm:p-8`}>
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gold/15 text-gold">
            <Icon icon="solar:clipboard-check-linear" width={24} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="quiz-heading" className="font-display text-2xl font-semibold text-ink dark:text-cream">
              Topic quiz
            </h2>
            {topic.state === 'completed' ? (
              <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-300">Passed. This topic is complete.</p>
            ) : (
              <p className="mt-1 text-sm leading-relaxed text-taupe dark:text-sand/70">
                Quizzes are coming soon. Until then, cover every lesson above to complete this topic.
              </p>
            )}
            {view.canComplete && (
              <form action={completeTopicAction} className="mt-5">
                <input type="hidden" name="courseId" value={course.id} />
                <input type="hidden" name="topicId" value={topic.id} />
                <button type="submit" className={darkPill}>
                  <Icon icon="solar:check-circle-linear" width={16} />
                  Complete topic
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <Link
        href={mapHref}
        className="mt-8 inline-flex items-center gap-1.5 text-sm text-taupe transition-colors duration-150 hover:text-ink dark:text-sand/70 dark:hover:text-cream"
      >
        <Icon icon="solar:arrow-left-linear" width={16} />
        Back to the map
      </Link>
    </>
  )
}

function LessonRow({
  lesson,
  index,
  courseId,
  topicId,
  editable,
}: {
  lesson: MapLesson
  index: number
  courseId: string
  topicId: string
  editable: boolean
}) {
  return (
    <li className={`${card} flex flex-wrap items-start gap-x-4 gap-y-3 p-4 sm:flex-nowrap sm:p-5`}>
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold ${
          lesson.done ? 'bg-gold text-espresso' : 'border-2 border-sand text-taupe dark:border-cocoa dark:text-sand/70'
        }`}
      >
        {lesson.done ? <Icon icon="lucide:check" width={16} strokeWidth={3} aria-label="Covered" /> : index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink dark:text-cream">{lesson.title}</p>
        {lesson.content && <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-taupe dark:text-sand/70">{lesson.content}</p>}
      </div>
      {!lesson.done && editable && (
        <form action={completeLessonAction} className="basis-full pl-[52px] sm:basis-auto sm:pl-0">
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="topicId" value={topicId} />
          <input type="hidden" name="lessonId" value={lesson.id} />
          <button
            type="submit"
            className="shrink-0 rounded-full border border-sand px-4 py-2 text-sm font-medium text-ink transition-[background-color,transform] duration-150 ease-out hover:bg-sand/50 active:scale-[0.97] dark:border-cocoa dark:text-cream dark:hover:bg-cocoa"
          >
            Mark covered
          </button>
        </form>
      )}
    </li>
  )
}
