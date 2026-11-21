'use client'

import { Icon } from '@iconify/react'
import { StatusShell } from '@/components/application/application-status-view'
import { darkPill } from '@/lib/styles'

export default function ApplicationStatusError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <StatusShell>
      <section
        role="alert"
        className="rounded-[1.75rem] border border-sand bg-white/70 px-5 py-10 text-center sm:px-6 sm:py-12 dark:border-cocoa dark:bg-cocoa/40"
      >
        <span className="mx-auto grid size-20 place-items-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
          <Icon icon="solar:danger-triangle-linear" width={34} />
        </span>
        <h2 className="mt-6 break-words font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl dark:text-cream">
          We couldn’t load your status
        </h2>
        <p className="mx-auto mt-3 max-w-md text-taupe dark:text-sand/70">
          Something went wrong on our side. Your application is safe. Please try again in a moment.
        </p>
        <button type="button" onClick={() => retry()} className={`${darkPill} mt-7 px-6 py-3`}>
          <Icon icon="solar:refresh-linear" width={16} />
          Try again
        </button>
      </section>
    </StatusShell>
  )
}
