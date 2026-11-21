import Link from 'next/link'
import { Icon } from '@iconify/react'
import { AchievementsGrid } from '@/components/learner/achievements/achievements-grid'
import { requireSessionUser } from '@/lib/learner'
import { LEARNER_ROUTES } from '@/lib/routes'
import { caller } from '@/trpc/server'

export const metadata = { title: 'My Achievements' }

export default async function AchievementsPage() {
  // Clerk session -> app user (resolved from the Clerk ID). The procedure filters every award by that user.
  await requireSessionUser()
  const achievements = await caller.learner.achievements()

  return (
    <main className="mx-auto w-full max-w-6xl px-6 pb-24 pt-8">
      <Link
        href={LEARNER_ROUTES.dashboard}
        className="inline-flex items-center gap-1.5 text-sm text-taupe transition-colors duration-150 hover:text-ink dark:text-sand/70 dark:hover:text-cream"
      >
        <Icon icon="solar:arrow-left-linear" width={16} />
        Back to dashboard
      </Link>

      <header className="mt-6 flex flex-wrap items-end justify-between gap-6 border-b border-sand pb-6 dark:border-cocoa">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Achievements</p>
          <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl dark:text-cream">My Achievements</h1>
          <p className="mt-2 max-w-xl text-taupe dark:text-sand/70">
            Badges you’ve earned on the foundation and your tracks. Each one is tied to the attempt that earned it.
          </p>
        </div>
        <dl className="flex gap-8 text-sm">
          <Stat label="Badges earned" value={`${achievements.stats.distinctEarned}/${achievements.stats.available}`} />
          <Stat label="Total awards" value={String(achievements.stats.awards)} />
        </dl>
      </header>

      <AchievementsGrid achievements={achievements} />
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <dt className="text-taupe dark:text-sand/60">{label}</dt>
      <dd className="font-display text-3xl font-semibold tabular-nums text-ink dark:text-cream">{value}</dd>
    </div>
  )
}
