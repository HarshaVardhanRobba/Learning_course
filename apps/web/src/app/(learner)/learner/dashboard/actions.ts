'use server'

import { revalidatePath } from 'next/cache'
import { startAttempt, startAttemptSchema } from '@workspace/core'
import { requireApprovedLearner } from '@/lib/learner'
import { LEARNER_ROUTES } from '@/lib/routes'

export async function startAttemptAction(formData: FormData): Promise<void> {
  // Server actions are reachable by direct POST, so the approval gate runs here too.
  const { user } = await requireApprovedLearner()

  const parsed = startAttemptSchema.safeParse({
    courseId: formData.get('courseId'),
    replaceInProgress: formData.get('replaceInProgress') ?? undefined,
  })
  if (!parsed.success) return

  // The user id comes from the session; the form only names the course.
  await startAttempt({ userId: user.id, ...parsed.data })
  revalidatePath(LEARNER_ROUTES.dashboard)
}
