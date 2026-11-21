'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { TRPCError } from '@trpc/server'
import { trackSlugSchema } from '@workspace/core'
import { LEARNER_ROUTES } from '@/lib/routes'
import { caller } from '@/trpc/server'

// Server actions are reachable by direct POST. They call the learner tRPC procedures, which validate the
// input with zod and enforce the session, approval, attempt ownership, version and unlock rules. Forms
// only name ids; the learner always comes from the session.

/** Runs a procedure from a form post. Invalid input or a denied call is a no-op, as before. */
async function run<T>(call: () => Promise<T>): Promise<T | null> {
  try {
    return await call()
  } catch (error) {
    if (error instanceof TRPCError) return null
    throw error
  }
}

const field = (formData: FormData, name: string) => formData.get(name) as string

function refreshLearnerPages() {
  revalidatePath('/learner', 'layout')
}

export async function completeLessonAction(formData: FormData): Promise<void> {
  await run(() =>
    caller.learner.completeLesson({
      courseId: field(formData, 'courseId'),
      topicId: field(formData, 'topicId'),
      lessonId: field(formData, 'lessonId'),
    }),
  )
  refreshLearnerPages()
}

/** Lesson viewer "Mark as completed": only the lesson id is sent. */
export async function completeLessonByIdAction(formData: FormData): Promise<void> {
  await run(() => caller.learner.completeLessonById({ lessonId: field(formData, 'lessonId') }))
  refreshLearnerPages()
}

export async function completeTopicAction(formData: FormData): Promise<void> {
  const result = await run(() =>
    caller.learner.completeTopic({ courseId: field(formData, 'courseId'), topicId: field(formData, 'topicId') }),
  )
  refreshLearnerPages()
  if (result?.ok) {
    const map = result.course.kind === 'foundation' ? LEARNER_ROUTES.foundation : LEARNER_ROUTES.track(result.course.slug)
    redirect(`${map}?completed=1`)
  }
}

/** Starts (or, with confirmation, replaces) an attempt from a learning map, then returns to that map. */
export async function startCourseAttemptAction(formData: FormData): Promise<void> {
  await run(() =>
    caller.learner.startAttempt({
      courseId: field(formData, 'courseId'),
      replaceInProgress: formData.get('replaceInProgress') === '1',
    }),
  )
  refreshLearnerPages()

  // The redirect target is rebuilt from a validated slug, never taken as a raw URL.
  const slug = trackSlugSchema.safeParse(formData.get('slug'))
  redirect(formData.get('kind') === 'track' && slug.success ? LEARNER_ROUTES.track(slug.data) : LEARNER_ROUTES.foundation)
}
