import Link from 'next/link'
import { Icon } from '@iconify/react'
import { requireAppUser } from '@workspace/auth'
import { findApplicationByUserId } from '@workspace/core'
import { LEARNER_ROUTES } from '@/lib/routes'
import { ApplicationStatusView, StatusShell } from '@/components/application/application-status-view'
import { darkPill } from '@/lib/styles'

export const metadata = { title: 'Application status' }

export default async function ApplicationStatusPage({ searchParams }: PageProps<'/learner/application-status'>) {
  // Identity comes only from the Clerk session; `submitted` only toggles a banner and never selects data.
  const user = await requireAppUser()
  const application = await findApplicationByUserId(user.id)
  const justSubmitted = (await searchParams).submitted === '1' && application?.status === 'pending'

  return (
    <StatusShell>
      {justSubmitted && (
        <p
          role="status"
          className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
        >
          <Icon icon="solar:check-circle-bold" width={20} className="shrink-0 text-emerald-600" />
          Thanks! Your application was submitted successfully.
        </p>
      )}
      {application ? (
        <ApplicationStatusView application={application} />
      ) : (
        <section className="rounded-[1.75rem] border border-sand bg-white/70 px-6 py-12 text-center dark:border-cocoa dark:bg-cocoa/40">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-sand/60 text-taupe dark:bg-cocoa dark:text-sand/70">
            <Icon icon="solar:document-add-linear" width={34} />
          </span>
          <h2 className="mt-6 font-display text-4xl font-semibold tracking-tight text-ink dark:text-cream">
            No application yet
          </h2>
          <p className="mx-auto mt-3 max-w-md text-taupe dark:text-sand/70">
            You haven’t applied to join yet. Submit an application to start the review.
          </p>
          <Link href={LEARNER_ROUTES.apply} className={`${darkPill} mt-7 px-6 py-3`}>
            Apply to join
            <Icon icon="solar:arrow-right-linear" width={16} />
          </Link>
        </section>
      )}
    </StatusShell>
  )
}
