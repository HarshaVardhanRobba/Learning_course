'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@workspace/auth'
import { applicationDecisionSchema, decideApplication } from '@workspace/core'
import { ADMIN_ROUTES, LEARNER_ROUTES } from '@/lib/routes'

export async function decideApplicationAction(formData: FormData): Promise<void> {
  // Server actions are reachable by direct POST, so the admin check runs here, not just in the layout.
  const admin = await requireAdmin()

  const parsed = applicationDecisionSchema.safeParse({
    applicationId: formData.get('applicationId'),
    decision: formData.get('decision'),
    reason: formData.get('reason') ?? '',
  })
  if (!parsed.success) return

  await decideApplication({ reviewerUserId: admin.id, decision: parsed.data })
  revalidatePath(ADMIN_ROUTES.dashboard)
  revalidatePath(LEARNER_ROUTES.status)
}
