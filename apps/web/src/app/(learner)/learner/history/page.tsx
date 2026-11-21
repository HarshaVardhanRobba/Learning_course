import Link from 'next/link'
import { Icon } from '@iconify/react'
import { historyListSchema, type HistoryFilter, type HistoryRow } from '@workspace/core'
import { AttemptStatusPill, courseName, historyDate } from '@/components/learner/history/history-parts'
import { requireSessionUser } from '@/lib/learner'
import { LEARNER_ROUTES } from '@/lib/routes'
import { caller } from '@/trpc/server'

export const metadata = { title: 'Learning history' }

const FILTERS: { value: HistoryFilter; label: string }[] = [
  { value: 'all', label: 'All courses' },
  { value: 'foundation', label: 'Foundation' },
  { value: 'tracks', label: 'Tracks' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
]

function listHref(filter: HistoryFilter, page = 1) {
  const params = new URLSearchParams()
  if (filter !== 'all') params.set('filter', filter)
  if (page > 1) params.set('page', String(page))
  const query = params.toString()
  return query ? `${LEARNER_ROUTES.history}?${query}` : LEARNER_ROUTES.history
}

export default async function HistoryPage({ searchParams }: PageProps<'/learner/history'>) {
  // Clerk session -> app user from the Clerk ID; the procedure scopes every row to that user.
  await requireSessionUser()
  const query = await searchParams
  const parsed = historyListSchema.safeParse({ filter: query.filter ?? undefined, page: query.page ?? undefined })
  const input = parsed.success ? parsed.data : { filter: 'all' as const, page: 1 }
  const history = await caller.learner.history.list(input)

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-8">
      <Link
        href={LEARNER_ROUTES.dashboard}
        className="inline-flex items-center gap-1.5 text-sm text-taupe transition-colors duration-150 hover:text-ink dark:text-sand/70 dark:hover:text-cream"
      >
        <Icon icon="solar:arrow-left-linear" width={16} />
        Back to dashboard
      </Link>

      <header className="mt-6 border-b border-sand pb-6 dark:border-cocoa">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">History</p>
        <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl dark:text-cream">Learning history</h1>
        <p className="mt-2 max-w-xl text-taupe dark:text-sand/70">
          Every enrollment attempt, current and past. Each keeps its own progress and scores on the course version it started with.
        </p>
      </header>

      <nav aria-label="Filter attempts" className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.value === history.filter
          return (
            <Link
              key={f.value}
              href={listHref(f.value)}
              aria-current={active ? 'page' : undefined}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors duration-150 ${
                active
                  ? 'border-espresso bg-espresso text-cream dark:border-cream dark:bg-cream dark:text-espresso'
                  : 'border-sand text-taupe hover:text-ink dark:border-cocoa dark:text-sand/70 dark:hover:text-cream'
              }`}
            >
              {f.label}
            </Link>
          )
        })}
      </nav>

      {history.rows.length === 0 ? (
        <p className="mt-8 rounded-[1.75rem] border border-dashed border-sand px-6 py-16 text-center text-taupe dark:border-cocoa dark:text-sand/70">
          {history.filter === 'all' ? 'No enrollment attempts yet. Start the Common Foundation from your dashboard.' : 'No attempts match this filter.'}
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-taupe dark:text-sand/70">
            {history.total} attempt{history.total === 1 ? '' : 's'}
          </p>
          <ul className="mt-3 space-y-4">
            {history.rows.map((row) => (
              <AttemptCard key={row.enrollmentId} row={row} />
            ))}
          </ul>
        </>
      )}

      {history.pageCount > 1 && (
        <nav aria-label="Pages" className="mt-8 flex items-center justify-between gap-4 text-sm">
          {history.page > 1 ? (
            <Link href={listHref(history.filter, history.page - 1)} className="inline-flex items-center gap-1.5 text-ink hover:underline dark:text-cream">
              <Icon icon="lucide:chevron-left" width={16} aria-hidden="true" />
              Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="tabular-nums text-taupe dark:text-sand/70">
            Page {history.page} of {history.pageCount}
          </span>
          {history.page < history.pageCount ? (
            <Link href={listHref(history.filter, history.page + 1)} className="inline-flex items-center gap-1.5 text-ink hover:underline dark:text-cream">
              Older
              <Icon icon="lucide:chevron-right" width={16} aria-hidden="true" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  )
}

function AttemptCard({ row }: { row: HistoryRow }) {
  return (
    <li>
      <Link
        href={LEARNER_ROUTES.historyAttempt(row.enrollmentId)}
        className="block rounded-[1.5rem] border border-sand bg-white/70 p-5 transition-colors duration-150 hover:border-gold sm:p-6 dark:border-cocoa dark:bg-cocoa/40"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-taupe dark:text-sand/60">
              <Icon icon={row.course.kind === 'foundation' ? 'solar:map-linear' : 'solar:routing-2-linear'} width={14} aria-hidden="true" />
              {row.course.kind === 'foundation' ? 'Foundation' : 'Track'}
            </p>
            <p className="mt-1 text-lg font-semibold text-ink dark:text-cream">{courseName(row.course)}</p>
          </div>
          <AttemptStatusPill status={row.status} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
          <Field label="Attempt" value={`#${row.attemptNumber}`} />
          <Field label="Version" value={`v${row.version}`} />
          <Field label="Started" value={historyDate.format(row.startedAt)} />
          <Field label="Completed" value={row.completedAt ? historyDate.format(row.completedAt) : '—'} />
          <Field label="Progress" value={`${row.percent}%`} />
          <Field label="Best assessment" value={row.bestAssessmentScore === null ? '—' : `${row.bestAssessmentScore}%`} />
        </dl>

        <div
          role="progressbar"
          aria-label={`${courseName(row.course)} attempt ${row.attemptNumber} progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={row.percent}
          className="mt-4 h-1.5 overflow-hidden rounded-full bg-sand/70 dark:bg-cocoa"
        >
          <div className="h-full rounded-full bg-gold" style={{ width: `${row.percent}%` }} />
        </div>
        <p className="mt-2 text-xs text-taupe dark:text-sand/60">
          {row.completedTopics}/{row.totalTopics} topics · {row.completedPhases}/{row.totalPhases} phases
        </p>
      </Link>
    </li>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-taupe dark:text-sand/60">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums text-ink dark:text-cream">{value}</dd>
    </div>
  )
}
