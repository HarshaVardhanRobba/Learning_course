import type { HistoryRow } from '@workspace/core'

export const historyDate = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'UTC' })
export const historyDateTime = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })

const STATUS: Record<HistoryRow['status'], { label: string; className: string }> = {
  in_progress: { label: 'In progress', className: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' },
  abandoned: { label: 'Replaced', className: 'bg-sand/70 text-taupe dark:bg-cocoa dark:text-sand/70' },
}

export function AttemptStatusPill({ status }: { status: HistoryRow['status'] }) {
  const s = STATUS[status]
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${s.className}`}>{s.label}</span>
}

export function courseName(course: HistoryRow['course']) {
  return course.kind === 'foundation' ? course.title : `${course.title}${course.streamTitle ? ` · ${course.streamTitle}` : ''}`
}

export function ScorePill({ score, passed }: { score: number | null; passed: boolean }) {
  if (score === null) return <span className="text-taupe dark:text-sand/60">In progress</span>
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
        passed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-sand/70 text-taupe dark:bg-cocoa dark:text-sand/70'
      }`}
    >
      {score}% · {passed ? 'Passed' : 'Not passed'}
    </span>
  )
}
