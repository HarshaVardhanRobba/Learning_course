import Link from 'next/link'
import { Icon } from '@iconify/react'
import type { CourseMap, MapLesson, MapPhase, MapTopic } from '@workspace/core'
import { setLessonCompletionAction } from '@/app/(learner)/learner/learning-actions'
import { SidebarScroller } from './sidebar-scroller'

export function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null
  const minutes = Math.max(1, Math.round(seconds / 60))
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}min` : `${minutes}min`
}

const checkboxBase = 'grid size-[18px] shrink-0 place-items-center rounded-[3px] border-2'

/**
 * "Course content": every phase and topic of the attempt's version. Each topic lists its lessons, each with
 * a checkbox that marks it completed (or clears it), and ends with the topic quiz. Locked topics have no
 * links or checkboxes; the server refuses them anyway.
 */
export function CourseSidebar({
  map,
  currentLessonId,
  currentTopicId,
  editable,
  quizIds,
  lessonHref,
  quizHref,
  assessmentHref,
}: {
  map: CourseMap
  currentLessonId: string
  currentTopicId: string
  /** Only the live attempt can be changed; older attempts show read-only checkboxes. */
  editable: boolean
  quizIds: Record<string, string>
  lessonHref: (lessonId: string) => string
  quizHref: (quizId: string) => string
  assessmentHref: (assessmentId: string) => string
}) {
  let number = 0
  return (
    <aside
      aria-label="Course content"
      className="border-sand bg-white/60 lg:sticky lg:top-20 lg:h-[calc(100dvh-5rem)] lg:border-l dark:border-cocoa dark:bg-cocoa/30"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-6 border-b border-sand px-6 dark:border-cocoa">
          <h2 className="relative py-4 text-base font-semibold text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-ink dark:text-cream dark:after:bg-cream">
            Course content
          </h2>
          <span className="text-sm tabular-nums text-taupe dark:text-sand/70">
            {map.completedTopics}/{map.totalTopics} topics
          </span>
        </div>

        <SidebarScroller className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-color:var(--color-taupe)_transparent] [scrollbar-width:thin]">
          {map.phases.map((phase) => (
            <section key={phase.id} aria-label={`Phase ${phase.position}: ${phase.title}`}>
              <p className="sticky top-0 z-10 border-b border-sand bg-cream px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-taupe dark:border-cocoa dark:bg-espresso dark:text-sand/60">
                Phase {phase.position} · {phase.title}
              </p>
              {phase.topics.map((topic) => {
                const locked = topic.state === 'locked'
                const quizId = quizIds[topic.id]
                return (
                  <details key={topic.id} open={topic.id === currentTopicId} className="group border-b border-sand dark:border-cocoa">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-3 bg-sand/30 px-6 py-3.5 hover:bg-sand/50 dark:bg-cocoa/40 dark:hover:bg-cocoa/70 [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink dark:text-cream">{topic.title}</span>
                        <span className="mt-0.5 block text-xs text-taupe dark:text-sand/60">
                          {locked ? 'Locked' : `${topic.lessonsDone} / ${topic.lessons.length} lessons`}
                          {topic.state === 'completed' && ' · quiz passed'}
                        </span>
                      </span>
                      <Icon
                        icon={locked ? 'solar:lock-keyhole-minimalistic-linear' : 'lucide:chevron-down'}
                        width={18}
                        aria-hidden="true"
                        className="mt-0.5 shrink-0 text-taupe transition-transform duration-150 group-open:rotate-180 dark:text-sand/60"
                      />
                    </summary>
                    <ol>
                      {topic.lessons.map((lesson) => {
                        number += 1
                        return (
                          <LessonRow
                            key={lesson.id}
                            lesson={lesson}
                            topic={topic}
                            number={number}
                            current={lesson.id === currentLessonId}
                            editable={editable}
                            href={lessonHref(lesson.id)}
                          />
                        )
                      })}
                      {quizId && <QuizRow topic={topic} href={quizHref(quizId)} />}
                    </ol>
                  </details>
                )
              })}
              {phase.assessmentId && <AssessmentRow phase={phase} href={assessmentHref(phase.assessmentId)} />}
            </section>
          ))}
        </SidebarScroller>
      </div>
    </aside>
  )
}

function LessonRow({
  lesson,
  topic,
  number,
  current,
  editable,
  href,
}: {
  lesson: MapLesson
  topic: MapTopic
  number: number
  current: boolean
  editable: boolean
  href: string
}) {
  const locked = topic.state === 'locked'
  const duration = formatDuration(lesson.durationSeconds)
  // A passed topic keeps its lessons checked: unchecking it would contradict the passed quiz.
  const canToggle = editable && !locked && topic.state !== 'completed'

  const box = lesson.done ? (
    <span className={`${checkboxBase} border-gold bg-gold text-espresso`}>
      <Icon icon="lucide:check" width={12} strokeWidth={3.5} aria-hidden="true" />
    </span>
  ) : (
    <span className={`${checkboxBase} border-ink/70 dark:border-cream/60`} />
  )

  const body = (
    <span className="min-w-0 flex-1">
      <span className="block text-sm leading-snug">
        {number}. {lesson.title}
      </span>
      <span className="mt-1.5 flex items-center gap-1.5 text-xs text-taupe dark:text-sand/60">
        <Icon icon={lesson.videoUid ? 'solar:play-circle-linear' : 'solar:document-text-linear'} width={14} aria-hidden="true" />
        {duration ?? (lesson.videoUid ? 'Video' : 'Reading')}
      </span>
    </span>
  )

  if (locked) {
    return (
      <li className="flex gap-4 px-6 py-3 text-taupe/80 dark:text-sand/50">
        <span className="mt-0.5">{box}</span>
        {body}
      </li>
    )
  }

  return (
    <li className={`flex items-start ${current ? 'bg-sand/80 dark:bg-cocoa' : 'hover:bg-sand/40 dark:hover:bg-cocoa/60'}`}>
      {/* The checkbox is its own control (a form button), separate from the lesson link. */}
      <form action={setLessonCompletionAction} className="py-3 pl-6 pr-2">
        <input type="hidden" name="lessonId" value={lesson.id} />
        <input type="hidden" name="done" value={lesson.done ? '0' : '1'} />
        <button
          type="submit"
          disabled={!canToggle}
          aria-pressed={lesson.done}
          aria-label={`${lesson.done ? 'Mark as not completed' : 'Mark as completed'}: ${lesson.title}`}
          title={
            canToggle
              ? lesson.done
                ? 'Mark as not completed'
                : 'Mark as completed'
              : topic.state === 'completed'
                ? 'Topic passed: lessons stay completed'
                : undefined
          }
          className="mt-0.5 rounded-[4px] p-0.5 transition-transform duration-150 ease-out hover:scale-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/40 active:scale-95 disabled:cursor-default disabled:hover:scale-100"
        >
          {box}
        </button>
      </form>
      <Link
        href={href}
        aria-current={current ? 'page' : undefined}
        className="flex min-w-0 flex-1 py-3 pr-6 text-ink dark:text-cream"
      >
        {body}
        <span className="sr-only">{lesson.done ? '(completed)' : '(not completed)'}</span>
      </Link>
    </li>
  )
}

function QuizRow({ topic, href }: { topic: MapTopic; href: string }) {
  const locked = topic.state === 'locked'
  const passed = topic.state === 'completed'
  const ready = passed || (topic.lessons.length > 0 && topic.lessonsDone === topic.lessons.length)
  const status = passed ? 'Passed' : ready ? 'Ready to take' : 'Unlocks after all lessons'

  const content = (
    <>
      <span
        className={`mt-0.5 grid size-[22px] shrink-0 place-items-center rounded-md ${
          passed ? 'bg-emerald-600 text-white' : ready ? 'bg-gold text-espresso' : 'bg-sand text-taupe dark:bg-cocoa dark:text-sand/60'
        }`}
      >
        <Icon icon={passed ? 'lucide:check' : 'solar:clipboard-check-linear'} width={14} strokeWidth={passed ? 3 : undefined} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium leading-snug">Topic quiz: {topic.title}</span>
        <span className="mt-1.5 flex items-center gap-1.5 text-xs text-taupe dark:text-sand/60">
          <Icon icon="solar:question-circle-linear" width={14} aria-hidden="true" />
          {status}
        </span>
      </span>
    </>
  )

  if (locked) {
    return <li className="flex gap-4 px-6 py-3 text-taupe/80 dark:text-sand/50">{content}</li>
  }
  return (
    <li>
      <Link href={href} className="flex gap-4 px-6 py-3 text-ink transition-colors duration-150 hover:bg-sand/40 dark:text-cream dark:hover:bg-cocoa/60">
        {content}
      </Link>
    </li>
  )
}

function AssessmentRow({ phase, href }: { phase: MapPhase; href: string }) {
  const open = phase.assessmentAvailable || phase.assessmentPassed
  const status = phase.assessmentPassed
    ? 'Passed: phase complete'
    : phase.assessmentAvailable
      ? 'Ready to take'
      : `Unlocks after all topic quizzes (${phase.completedTopics}/${phase.topics.length})`
  const content = (
    <>
      <span
        className={`mt-0.5 grid size-[22px] shrink-0 rotate-45 place-items-center rounded-md ${
          phase.assessmentPassed ? 'bg-emerald-600 text-white' : open ? 'bg-gold-soft text-espresso' : 'bg-sand text-taupe dark:bg-cocoa dark:text-sand/60'
        }`}
      >
        <Icon icon={phase.assessmentPassed ? 'lucide:check' : 'solar:cup-star-linear'} width={13} className="-rotate-45" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-snug">Phase {phase.position} assessment</span>
        <span className="mt-1.5 block text-xs text-taupe dark:text-sand/60">{status}</span>
      </span>
    </>
  )
  return open ? (
    <Link href={href} className="flex gap-4 border-b border-sand bg-gold/5 px-6 py-3.5 text-ink transition-colors duration-150 hover:bg-sand/40 dark:border-cocoa dark:text-cream dark:hover:bg-cocoa/60">
      {content}
    </Link>
  ) : (
    <div className="flex gap-4 border-b border-sand px-6 py-3.5 text-taupe/80 dark:border-cocoa dark:text-sand/50">{content}</div>
  )
}
