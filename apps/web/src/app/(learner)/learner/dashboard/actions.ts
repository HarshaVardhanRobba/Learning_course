'use server'

import { revalidatePath } from 'next/cache'
import { TRPCError } from '@trpc/server'
import { caller } from '@/trpc/server'

export async function startAttemptAction(formData: FormData): Promise<void> {
  // The procedure validates the input and enforces session, approval and foundation rules.
  try {
    await caller.learner.startAttempt({
      courseId: formData.get('courseId') as string,
      replaceInProgress: formData.get('replaceInProgress') === '1',
    })
  } catch (error) {
    if (!(error instanceof TRPCError)) throw error
  }
  // Every learner page reads attempts, so refresh them all.
  revalidatePath('/learner', 'layout')
}
