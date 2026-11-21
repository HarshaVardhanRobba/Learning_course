import Link from 'next/link'
import { Icon } from '@iconify/react'
import type { ApplicationWithReview } from '@workspace/core'
import { caller } from '@/trpc/server'
import type { ApplicationStatus } from '@workspace/db'
import { decideApplicationAction } from '../actions'
import { ADMIN_ROUTES } from '@/lib/routes'
import { darkPill } from '@/lib/styles'

export const metadata = { title: 'Admin dashboard' }

const FILTERS: { label: string; value?: ApplicationStatus }[] = [
  { label: 'All' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
]

const PILL: Record<ApplicationStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
}

const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })

function isStatus(value: unknown): value is ApplicationStatus {
  return value === 'pending' || value === 'approved' || value === 'rejected'
}

export default async function AdminDashboardPage({ searchParams }: PageProps<'/admin/dashboard'>) {
  // The admin layout 404s non-admins; the admin procedures enforce the role again.
  const raw = (await searchParams).status
  const filter = isStatus(raw) ? raw : undefined
  const [applications, counts] = await Promise.all([
    caller.admin.applications({ status: filter }),
    caller.admin.applicationCounts(),
  ])
  const total = counts.pending + counts.approved + counts.rejected

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-sand pb-6 dark:border-cocoa">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Admin</p>
          <h1 className="mt-1 break-words font-display text-3xl font-semibold tracking-tight text-ink sm:text-5xl dark:text-cream">
            Learner applications
          </h1>
        </div>
        <dl className="flex flex-wrap gap-6 text-sm">
          <Stat label="Pending" value={counts.pending} />
          <Stat label="Approved" value={counts.approved} />
          <Stat label="Rejected" value={counts.rejected} />
        </dl>
      </div>

      <nav aria-label="Filter applications" className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.value === filter
          const count = f.value ? counts[f.value] : total
          return (
            <Link
              key={f.label}
              href={f.value ? `${ADMIN_ROUTES.dashboard}?status=${f.value}` : ADMIN_ROUTES.dashboard}
              aria-current={active ? 'page' : undefined}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors duration-150 ${
                active
                  ? 'border-espresso bg-espresso text-cream dark:border-cream dark:bg-cream dark:text-espresso'
                  : 'border-sand text-taupe hover:text-ink dark:border-cocoa dark:text-sand/70 dark:hover:text-cream'
              }`}
            >
              {f.label} <span className="tabular-nums opacity-70">{count}</span>
            </Link>
          )
        })}
      </nav>

      {applications.length === 0 ? (
        <p className="mt-10 rounded-[1.75rem] border border-dashed border-sand px-6 py-16 text-center text-taupe dark:border-cocoa dark:text-sand/70">
          {filter ? `No ${filter} applications.` : 'No applications yet.'}
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {applications.map((application) => (
            <ApplicationRow key={application.id} application={application} />
          ))}
        </ul>
      )}
    </>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-right">
      <dt className="text-taupe dark:text-sand/60">{label}</dt>
      <dd className="font-display text-3xl font-semibold tabular-nums text-ink dark:text-cream">{value}</dd>
    </div>
  )
}

function ApplicationRow({ application: a }: { application: ApplicationWithReview }) {
  return (
    <li className="rounded-[1.5rem] border border-sand bg-white/70 p-5 sm:p-6 dark:border-cocoa dark:bg-cocoa/40">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-lg font-semibold text-ink dark:text-cream">
            {a.firstName} {a.lastName}
          </p>
          <dl className="mt-2 grid gap-x-8 gap-y-1.5 text-sm text-taupe lg:grid-cols-[auto_auto_auto] dark:text-sand/70">
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Email</dt>
              <Icon icon="solar:letter-linear" width={15} aria-hidden="true" />
              <dd className="break-all">
                <a href={`mailto:${a.email}`} className="hover:text-ink dark:hover:text-cream">
                  {a.email}
                </a>
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Mobile</dt>
              <Icon icon="solar:phone-linear" width={15} aria-hidden="true" />
              <dd>
                <a href={`tel:${a.phone}`} className="tabular-nums hover:text-ink dark:hover:text-cream">
                  {a.phone}
                </a>
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              <dt className="sr-only">Submitted</dt>
              <Icon icon="solar:calendar-linear" width={15} aria-hidden="true" />
              <dd>
                <time dateTime={a.submittedAt.toISOString()}>{dateFormat.format(a.submittedAt)} UTC</time>
              </dd>
            </div>
          </dl>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${PILL[a.status]}`}>
          {a.status}
        </span>
      </div>

      {a.status === 'pending' ? (
        <div className="mt-5 flex flex-wrap items-start gap-3 border-t border-sand pt-5 dark:border-cocoa">
          <form action={decideApplicationAction}>
            <input type="hidden" name="applicationId" value={a.id} />
            <input type="hidden" name="decision" value="approve" />
            <button type="submit" className={`${darkPill} bg-emerald-700 hover:bg-emerald-600 dark:bg-emerald-600 dark:text-white`}>
              <Icon icon="lucide:check" width={16} strokeWidth={3} />
              Approve
            </button>
          </form>

          <details className="group min-w-0 flex-1">
            <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full border border-rose-300 px-5 py-2.5 text-sm font-medium text-rose-700 transition-colors duration-150 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10 [&::-webkit-details-marker]:hidden">
              <Icon icon="lucide:x" width={16} strokeWidth={3} />
              Reject…
            </summary>
            <form action={decideApplicationAction} className="mt-3 max-w-xl space-y-3">
              <input type="hidden" name="applicationId" value={a.id} />
              <input type="hidden" name="decision" value="reject" />
              <label htmlFor={`reason-${a.id}`} className="text-sm font-medium text-ink dark:text-cream">
                Reason <span aria-hidden="true" className="text-rose-600">*</span>{' '}
                <span className="font-normal text-taupe">(required, shown to the applicant)</span>
              </label>
              <textarea
                id={`reason-${a.id}`}
                name="reason"
                rows={3}
                required
                minLength={1}
                maxLength={500}
                className="w-full rounded-2xl border border-sand bg-white px-4 py-3 text-sm text-ink outline-none focus:border-gold focus:ring-4 focus:ring-gold/15 dark:border-cocoa dark:bg-espresso dark:text-cream"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-rose-700 px-5 py-2.5 text-sm font-medium text-white transition-[background-color,transform] duration-150 ease-out hover:bg-rose-600 active:scale-[0.97]"
              >
                Confirm rejection
              </button>
            </form>
          </details>
        </div>
      ) : (
        <div className="mt-4 border-t border-sand pt-4 text-sm text-taupe dark:border-cocoa dark:text-sand/70">
          {a.status === 'approved' ? 'Approved' : 'Rejected'}
          {a.review && <> on {dateFormat.format(a.review.createdAt)} UTC</>}
          {a.review?.rejectionReason && <p className="mt-1 text-ink dark:text-cream">Reason: {a.review.rejectionReason}</p>}
        </div>
      )}
    </li>
  )
}
