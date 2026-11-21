import Link from 'next/link'
import { Icon } from '@iconify/react'
import type { CourseMap } from '@workspace/core'
import { SidebarScroller } from './sidebar-scroller'

export function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null
  const minutes = Math.max(1, Math.round(seconds / 60))
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}min` : `${minutes}min`
}

/**
 * "Course content": every phase and topic of the attempt's version, with the lessons of each topic.
 * Locked topics list their lessons without links; the server refuses them anyway.
 */
export function CourseSidebar({
  map,
  currentLessonId,
  currentTopicId,
  hrefFor,
}: {
  map: CourseMap
  currentLessonId: string
  currentTopicId: string
  hrefFor: (lessonId: string) => string
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
                        const current = lesson.id === currentLessonId
                        const duration = formatDuration(lesson.durationSeconds)
                        const row = (
                          <>
                            <span
                              aria-hidden="true"
                              className={`mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-[3px] border-2 ${
                                lesson.done ? 'border-gold bg-gold text-espresso' : 'border-ink/70 dark:border-cream/60'
                              }`}
                            >
                              {lesson.done && <Icon icon="lucide:check" width={12} strokeWidth={3.5} />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm leading-snug">
                                {number}. {lesson.title}
                              </span>
                              <span className="mt-1.5 flex items-center gap-1.5 text-xs text-taupe dark:text-sand/60">
                                <Icon icon={lesson.videoUid ? 'solar:play-circle-linear' : 'solar:document-text-linear'} width={14} aria-hidden="true" />
                                {duration ?? (lesson.videoUid ? 'Video' : 'Reading')}
                              </span>
                            </span>
                            <span className="sr-only">{lesson.done ? '(completed)' : '(not completed)'}</span>
                          </>
                        )
                        return (
                          <li key={lesson.id}>
                            {locked ? (
                              <div className="flex gap-4 px-6 py-3 text-taupe/80 dark:text-sand/50">{row}</div>
                            ) : (
                              <Link
                                href={hrefFor(lesson.id)}
                                aria-current={current ? 'page' : undefined}
                                className={`flex gap-4 px-6 py-3 text-ink transition-colors duration-150 dark:text-cream ${
                                  current ? 'bg-sand/80 dark:bg-cocoa' : 'hover:bg-sand/40 dark:hover:bg-cocoa/60'
                                }`}
                              >
                                {row}
                              </Link>
                            )}
                          </li>
                        )
                      })}
                    </ol>
                  </details>
                )
              })}
            </section>
          ))}
        </SidebarScroller>
      </div>
    </aside>
  )
}
