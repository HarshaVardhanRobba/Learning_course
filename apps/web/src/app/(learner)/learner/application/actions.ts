'use server'

import { redirect } from 'next/navigation'
import { TRPCError } from '@trpc/server'
import { applicationInputSchema, type ApplicationField } from '@workspace/core'
import { requireSessionUser } from '@/lib/learner'
import { LEARNER_ROUTES } from '@/lib/routes'
import { caller } from '@/trpc/server'

export type ApplyFormState = {
  message?: string
  fieldErrors?: Partial<Record<ApplicationField, string>>
  values?: Partial<Record<ApplicationField, string>>
}

export async function submitApplicationAction(_prev: ApplyFormState, formData: FormData): Promise<ApplyFormState> {
  await requireSessionUser()

  const values = {
    firstName: String(formData.get('firstName') ?? ''),
    lastName: String(formData.get('lastName') ?? ''),
    phone: String(formData.get('phone') ?? ''),
  }
  // Parsed here only to show field-level messages; the procedure validates again.
  const parsed = applicationInputSchema.safeParse(values)
  if (!parsed.success) {
    const fieldErrors: ApplyFormState['fieldErrors'] = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as ApplicationField
      fieldErrors[field] ??= issue.message
    }
    return { fieldErrors, values }
  }

  // Identity and email come from the Clerk session inside the procedure, never from the form.
  let submitted = false
  try {
    submitted = (await caller.application.submit(values)).ok
  } catch (error) {
    if (error instanceof TRPCError && error.code === 'PRECONDITION_FAILED') {
      return { message: 'Your account has no email address. Add one in your account settings, then try again.', values }
    }
    throw error
  }
  redirect(submitted ? `${LEARNER_ROUTES.status}?submitted=1` : LEARNER_ROUTES.status)
}
