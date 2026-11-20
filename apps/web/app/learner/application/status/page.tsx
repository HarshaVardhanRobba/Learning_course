import { redirect } from 'next/navigation'
import { Icon } from '@iconify/react'
import { requireAppUser } from '@/lib/auth/app-user'
import { getApplicationForUser, LEARNER_ROUTES } from '@/lib/learner/applications'

export const metadata = { title: 'Application status' }

const dateFormat = new Intl.DateTimeFormat('en', { dateStyle: 'long' })

export default async function ApplicationStatusPage() {
  const user = await requireAppUser()
  const application = await getApplicationForUser(user.id)

  if (!application) redirect(LEARNER_ROUTES.apply)
  if (application.status === 'approved') redirect(LEARNER_ROUTES.dashboard)

  const rejected = application.status === 'rejected'

  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <div className="rounded-[2rem] border border-sand bg-white/60 p-10 dark:border-cocoa dark:bg-cocoa/40">
        <span
          className={`grid size-12 place-items-center rounded-full ${
            rejected ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' : 'bg-gold/15 text-gold'
          }`}
        >
          <Icon icon={rejected ? 'solar:close-circle-linear' : 'solar:hourglass-line-linear'} width={24} />
        </span>

        <h1 className="mt-6 font-display text-4xl font-medium tracking-tight text-ink dark:text-cream">
          {rejected ? 'Application not approved' : 'Application under review'}
        </h1>

        <p className="mt-3 leading-relaxed text-taupe dark:text-sand/70">
          {rejected
            ? 'Thank you for applying. After review, your application was not approved, and resubmission is not available.'
            : 'Thanks for applying. Our team reviews every application by hand, and you will get access to your learner dashboard as soon as yours is approved.'}
        </p>

        <dl className="mt-8 grid grid-cols-2 gap-6 border-t border-sand pt-6 text-sm dark:border-cocoa">
          <div>
            <dt className="text-taupe dark:text-sand/60">Submitted</dt>
            <dd className="mt-1 font-medium text-ink dark:text-cream">{dateFormat.format(application.submittedAt)}</dd>
          </div>
          <div>
            <dt className="text-taupe dark:text-sand/60">Status</dt>
            <dd className="mt-1 font-medium capitalize text-ink dark:text-cream">{application.status}</dd>
          </div>
        </dl>
      </div>
    </main>
  )
}
