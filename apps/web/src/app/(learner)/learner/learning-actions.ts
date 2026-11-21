'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  completeLesson,
  completeLessonSchema,
  completeTopic,
  completeTopicSchema,
  startAttempt,
  startAttemptSchema,
  trackSlugSchema,
} from '@workspace/core'
import { requireApprovedLearner } from '@/lib/learner'
import { LEARNER_ROUTES } from '@/lib/routes'

// Server actions are reachable by direct POST. Each one re-runs the approval gate, and the services
// re-check foundation completion, the learner's live attempt, version ownership and unlock rules.
// Forms only name ids; the learner and attempt always come from the session.

function refreshLearnerPages() {
  revalidatePath('/learner', 'layout')
}

function mapPath(course: { kind: 'foundation' | 'track'; slug: string }) {
  return course.kind === 'foundation' ? LEARNER_ROUTES.foundation : LEARNER_ROUTES.track(course.slug)
}

export async function completeLessonAction(formData: FormData): Promise<void> {
  const { user } = await requireApprovedLearner()
  const parsed = completeLessonSchema.safeParse({
    courseId: formData.get('courseId'),
    topicId: formData.get('topicId'),
    lessonId: formData.get('lessonId'),
  })
  if (!parsed.success) return

  await completeLesson({ userId: user.id, ...parsed.data })
  refreshLearnerPages()
}

export async function completeTopicAction(formData: FormData): Promise<void> {
  const { user } = await requireApprovedLearner()
  const parsed = completeTopicSchema.safeParse({ courseId: formData.get('courseId'), topicId: formData.get('topicId') })
  if (!parsed.success) return

  const result = await completeTopic({ userId: user.id, ...parsed.data })
  refreshLearnerPages()
  if (result.ok) redirect(`${mapPath(result.course)}?completed=1`)
}

/** Starts (or, with confirmation, replaces) an attempt from a learning map, then returns to that map. */
export async function startCourseAttemptAction(formData: FormData): Promise<void> {
  const { user } = await requireApprovedLearner()
  const parsed = startAttemptSchema.safeParse({
    courseId: formData.get('courseId'),
    replaceInProgress: formData.get('replaceInProgress') ?? undefined,
  })
  if (!parsed.success) return

  await startAttempt({ userId: user.id, ...parsed.data })
  refreshLearnerPages()

  // The redirect target is rebuilt from a validated slug, never taken as a raw URL.
  const slug = trackSlugSchema.safeParse(formData.get('slug'))
  redirect(formData.get('kind') === 'track' && slug.success ? LEARNER_ROUTES.track(slug.data) : LEARNER_ROUTES.foundation)
}
