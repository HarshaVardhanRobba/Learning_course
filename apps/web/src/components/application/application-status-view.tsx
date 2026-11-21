import Link from 'next/link'
import { Icon } from '@iconify/react'
import type { Application, ApplicationReview, ApplicationStatus } from '@workspace/db'
import { LEARNER_ROUTES } from '@/lib/routes'
import { darkPill } from '@/lib/styles'

export type StatusViewApplication = Pick<
  Application,
  'status' | 'submittedAt' | 'firstName' | 'lastName' | 'email' | 'phone'
> & { review: Pick<ApplicationReview, 'createdAt' | 'rejectionReason'> | null }

const card = 'rounded-[1.75rem] border border-sand bg-white/70 dark:border-cocoa dark:bg-cocoa/40'

const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' })

export function StatusShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sand pb-6 dark:border-cocoa">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <span className="grid size-11 shrink-0 place-items-center sm:size-12 rounded-2xl bg-espresso text-gold-soft dark:bg-cocoa">
            <Icon icon="solar:document-text-linear" width={22} />
          </span>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl dark:text-cream">
            Application status
          </h1>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-taupe transition-colors duration-150 hover:text-ink dark:text-sand/70 dark:hover:text-cream"
        >
          <Icon icon="solar:arrow-left-linear" width={16} />
          Back to site
        </Link>
      </div>
      <div className="mt-8 space-y-5">{children}</div>
    </main>
  )
}

const HERO: Record<
  ApplicationStatus,
  { icon: string; iconClass: string; title: string; message: string }
> = {
  pending: {
    icon: 'solar:hourglass-line-linear',
    iconClass: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    title: 'Application submitted',
    message: 'Your application is awaiting administrator review.',
  },
  approved: {
    icon: 'solar:check-circle-linear',
    iconClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    title: 'You’re approved',
    message: 'Welcome aboard. Your learning access is now active.',
  },
  rejected: {
    icon: 'solar:close-circle-linear',
    iconClass: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    title: 'Application not approved',
    message: 'After review, your application was not approved.',
  },
}

const PILL: Record<ApplicationStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
}

export function ApplicationStatusView({ application }: { application: StatusViewApplication }) {
  const { status } = application
  const hero = HERO[status]

  return (
    <>
      <section aria-labelledby="status-heading" className={`${card} px-6 py-10 text-center sm:px-12`}>
        <span className={`mx-auto grid size-20 place-items-center rounded-full ${hero.iconClass}`}>
          <Icon icon={hero.icon} width={36} />
        </span>
        <h2 id="status-heading" className="mt-6 break-words font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl dark:text-cream">
          {hero.title}
        </h2>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-taupe dark:text-sand/70">{hero.message}</p>

        {status === 'pending' && (
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-taupe dark:text-sand/60">
            Learning access becomes available as soon as your application is approved. We review every
            application by hand.
          </p>
        )}

        {status === 'rejected' && (
          <div className="mx-auto mt-6 max-w-md space-y-3 text-left">
            {application.review?.rejectionReason && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/20 dark:bg-rose-500/10">
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-800 dark:text-rose-300">
                  Reason from the reviewer
                </p>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink dark:text-cream">
                  {application.review.rejectionReason}
                </p>
              </div>
            )}
            <p className="text-center text-sm text-taupe dark:text-sand/60">
              Resubmission isn’t available for this application.
            </p>
          </div>
        )}

        {status === 'approved' && (
          <Link href={LEARNER_ROUTES.dashboard} className={`${darkPill} mt-7 px-6 py-3`}>
            Go to learner dashboard
            <Icon icon="solar:arrow-right-linear" width={16} />
          </Link>
        )}

        <Stepper status={status} />
      </section>

      <section aria-label="Application details" className={`${card} flex items-center gap-5 p-5 sm:p-6`}>
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-sand/60 text-ink dark:bg-cocoa dark:text-cream">
          <Icon icon="solar:user-id-linear" width={26} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink dark:text-cream">Learner application</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-taupe dark:text-sand/60">
            <Icon icon="solar:calendar-linear" width={15} />
            Submitted{' '}
            <time dateTime={application.submittedAt.toISOString()}>{dateFormat.format(application.submittedAt)}</time>
          </p>
          {application.review && (
            <p className="mt-0.5 text-sm text-taupe dark:text-sand/60">
              Decided{' '}
              <time dateTime={application.review.createdAt.toISOString()}>{dateFormat.format(application.review.createdAt)}</time>
            </p>
          )}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${PILL[status]}`}>
          {status}
        </span>
      </section>

      <section aria-labelledby="details-heading" className={`${card} p-6 sm:p-8`}>
        <h2 id="details-heading" className="font-display text-2xl font-semibold text-ink dark:text-cream">
          Your details
        </h2>
        <dl className="mt-5 grid gap-5 text-sm sm:grid-cols-2">
          <Detail label="Full name" value={`${application.firstName} ${application.lastName}`} />
          <Detail label="Mobile number" value={application.phone} />
          <Detail label="Email" value={application.email} className="sm:col-span-2" />
        </dl>
      </section>
    </>
  )
}

function Detail({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-taupe dark:text-sand/60">{label}</dt>
      <dd className="mt-1 break-words font-medium text-ink dark:text-cream">{value}</dd>
    </div>
  )
}

function Stepper({ status }: { status: ApplicationStatus }) {
  const decided = status !== 'pending'
  const steps = [
    { label: 'Submitted', state: 'done' as const },
    { label: 'Under review', state: decided ? ('done' as const) : ('current' as const) },
    {
      label: status === 'approved' ? 'Approved' : status === 'rejected' ? 'Not approved' : 'Decision',
      state: status === 'approved' ? ('done' as const) : status === 'rejected' ? ('failed' as const) : ('upcoming' as const),
    },
  ]

  return (
    <ol aria-label="Application progress" className="mx-auto mt-10 flex max-w-md items-start">
      {steps.map((step, i) => (
        <li key={step.label} className="relative flex flex-1 flex-col items-center">
          {i > 0 && (
            <span
              aria-hidden="true"
              className={`absolute right-[calc(50%+1.5rem)] top-[17px] h-0.5 w-[calc(100%-3rem)] ${
                step.state === 'upcoming' ? 'bg-sand dark:bg-cocoa' : 'bg-gold'
              }`}
            />
          )}
          <span
            aria-current={step.state === 'current' ? 'step' : undefined}
            className={`relative z-10 grid size-9 place-items-center rounded-full text-sm font-semibold ${
              step.state === 'done'
                ? 'bg-gold text-espresso'
                : step.state === 'failed'
                  ? 'bg-rose-600 text-white'
                  : step.state === 'current'
                    ? 'border-2 border-gold bg-white text-ink ring-4 ring-gold/20 dark:bg-espresso dark:text-cream'
                    : 'border-2 border-sand bg-white text-taupe dark:border-cocoa dark:bg-espresso'
            }`}
          >
            {step.state === 'done' ? (
              <Icon icon="lucide:check" width={16} strokeWidth={3} />
            ) : step.state === 'failed' ? (
              <Icon icon="lucide:x" width={16} strokeWidth={3} />
            ) : (
              i + 1
            )}
          </span>
          <span
            className={`mt-2.5 text-xs font-medium sm:text-sm ${
              step.state === 'upcoming' ? 'text-taupe/70 dark:text-sand/50' : 'text-ink dark:text-cream'
            }`}
          >
            {step.label}
            <span className="sr-only">
              {step.state === 'done' ? ' (complete)' : step.state === 'current' ? ' (in progress)' : step.state === 'failed' ? ' (declined)' : ' (not started)'}
            </span>
          </span>
        </li>
      ))}
    </ol>
  )
}
