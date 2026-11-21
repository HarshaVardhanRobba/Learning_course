'use server'

import { revalidatePath } from 'next/cache'
import { TRPCError } from '@trpc/server'
import type { RouterInputs } from '@/trpc/types'
import { ADMIN_ROUTES, LEARNER_ROUTES } from '@/lib/routes'
import { caller } from '@/trpc/server'

export async function decideApplicationAction(formData: FormData): Promise<void> {
  // Server actions are reachable by direct POST: the admin procedure checks the role and validates input.
  try {
    await caller.admin.decideApplication({
      applicationId: formData.get('applicationId'),
      decision: formData.get('decision'),
      reason: formData.get('reason') ?? '',
    } as RouterInputs['admin']['decideApplication'])
  } catch (error) {
    if (!(error instanceof TRPCError)) throw error
    return
  }
  revalidatePath(ADMIN_ROUTES.dashboard)
  revalidatePath(LEARNER_ROUTES.status)
}
