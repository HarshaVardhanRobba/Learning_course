'use server'

import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { getClerkProfile } from '@workspace/auth'
import { applicationInputSchema, submitApplication, type ApplicationField } from '@workspace/core'
import { LEARNER_ROUTES } from '@/lib/routes'

export type ApplyFormState = {
  message?: string
  fieldErrors?: Partial<Record<ApplicationField, string>>
  values?: Partial<Record<ApplicationField, string>>
}

export async function submitApplicationAction(_prev: ApplyFormState, formData: FormData): Promise<ApplyFormState> {
  const { userId, redirectToSignIn } = await auth()
  if (!userId) return redirectToSignIn()

  // Identity and email come from Clerk, never from the submitted form.
  const profile = await getClerkProfile()
  if (!profile?.email) {
    return { message: 'Your account has no email address. Add one in your account settings, then try again.' }
  }

  const values = {
    firstName: String(formData.get('firstName') ?? ''),
    lastName: String(formData.get('lastName') ?? ''),
    phone: String(formData.get('phone') ?? ''),
  }
  const parsed = applicationInputSchema.safeParse(values)
  if (!parsed.success) {
    const fieldErrors: ApplyFormState['fieldErrors'] = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as ApplicationField
      fieldErrors[field] ??= issue.message
    }
    return { fieldErrors, values }
  }

  const result = await submitApplication({ clerkId: userId, email: profile.email, input: parsed.data })
  redirect(result.ok ? `${LEARNER_ROUTES.status}?submitted=1` : LEARNER_ROUTES.status)
}
