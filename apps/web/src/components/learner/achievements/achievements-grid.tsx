'use client'

import * as React from 'react'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import type { RouterOutputs } from '@/trpc/types'
import { LEARNER_ROUTES } from '@/lib/routes'
import { darkPill } from '@/lib/styles'

type Achievements = RouterOutputs['learner']['achievements']
type Award = Achievements['awards'][number]
type LockedBadge = Achievements['locked'][number]

const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' })
const card = 'rounded-[1.75rem] border border-sand bg-white/70 dark:border-cocoa dark:bg-cocoa/40'

function courseLabel(course: Award['course']) {
  return course.kind === 'foundation' ? course.title : `${course.title}${course.streamTitle ? ` · ${course.streamTitle}` : ''}`
}

function courseHref(course: Award['course']) {
  return course.kind === 'foundation' ? LEARNER_ROUTES.foundation : LEARNER_ROUTES.track(course.slug)
}

const ATTEMPT_STATUS: Record<Award['attempt']['status'], string> = {
  in_progress: 'in progress',
  completed: 'completed',
  abandoned: 'replaced',
}

/** Earned awards (one card per award, so repeat awards on later attempts are kept) and locked previews. */
export function AchievementsGrid({ achievements }: { achievements: Achievements }) {
  const [selected, setSelected] = React.useState<{ kind: 'award'; award: Award } | { kind: 'locked'; badge: LockedBadge } | null>(null)

  return (
    <>
      <section aria-labelledby="earned-heading" className="mt-10">
        <h2 id="earned-heading" className="font-display text-3xl font-semibold text-ink dark:text-cream">
          Earned
        </h2>
        {achievements.awards.length === 0 ? (
          <div className={`${card} mt-5 px-6 py-12 text-center`}>
            <Icon icon="solar:medal-ribbons-star-linear" width={44} className="mx-auto text-gold" aria-hidden="true" />
            <p className="mt-4 font-display text-2xl font-semibold text-ink dark:text-cream">No badges yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-taupe dark:text-sand/70">
              Pass your first topic quiz to earn one. Badges are awarded automatically as you progress.
            </p>
            <Link href={LEARNER_ROUTES.foundation} className={`${darkPill} mt-6`}>
              Go to the foundation
              <Icon icon="solar:arrow-right-linear" width={16} aria-hidden="true" />
            </Link>
          </div>
        ) : (
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {achievements.awards.map((award) => (
              <li key={award.awardId}>
                <button
                  type="button"
                  onClick={() => setSelected({ kind: 'award', award })}
                  className={`${card} group flex h-full w-full flex-col items-center p-6 text-center transition-[border-color,transform] duration-150 ease-out hover:-translate-y-0.5 hover:border-gold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/30`}
                >
                  <BadgeIcon icon={award.badge.icon} earned />
                  <span className="mt-4 font-display text-2xl font-semibold text-ink dark:text-cream">{award.badge.title}</span>
                  <span className="mt-1 text-sm leading-relaxed text-taupe dark:text-sand/70">{award.badge.description}</span>
                  <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-sand/60 px-3 py-1 text-xs font-medium text-ink dark:bg-cocoa dark:text-cream">
                    <Icon icon={award.course.kind === 'foundation' ? 'solar:map-linear' : 'solar:routing-2-linear'} width={13} aria-hidden="true" />
                    {courseLabel(award.course)}
                  </span>
                  <span className="mt-2 text-xs text-taupe dark:text-sand/60">
                    Earned <time dateTime={award.earnedAt.toISOString()}>{dateFormat.format(award.earnedAt)}</time> · attempt #
                    {award.attempt.number}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {achievements.locked.length > 0 && (
        <section aria-labelledby="locked-heading" className="mt-14">
          <h2 id="locked-heading" className="font-display text-3xl font-semibold text-ink dark:text-cream">
            Still to earn
          </h2>
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {achievements.locked.map((badge) => (
              <li key={badge.id}>
                <button
                  type="button"
                  onClick={() => setSelected({ kind: 'locked', badge })}
                  className="flex h-full w-full flex-col items-center rounded-[1.75rem] border border-dashed border-sand p-6 text-center transition-colors duration-150 hover:border-taupe focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/30 dark:border-cocoa"
                >
                  <BadgeIcon icon={badge.icon} earned={false} />
                  <span className="mt-4 font-semibold text-ink/80 dark:text-cream/80">{badge.title}</span>
                  <span className="mt-1 text-xs text-taupe dark:text-sand/60">{badge.howToEarn || 'Keep learning to unlock it.'}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="rounded-[1.75rem] border-sand bg-cream p-7 sm:max-w-md dark:border-cocoa dark:bg-espresso">
          {selected?.kind === 'award' && <AwardDetail award={selected.award} />}
          {selected?.kind === 'locked' && <LockedDetail badge={selected.badge} />}
        </DialogContent>
      </Dialog>
    </>
  )
}

function BadgeIcon({ icon, earned }: { icon: string; earned: boolean }) {
  return (
    <span
      className={`relative grid size-20 place-items-center rounded-full ${
        earned
          ? 'bg-gradient-to-br from-gold-soft to-gold text-espresso shadow-[inset_0_-5px_0_rgba(0,0,0,0.15)]'
          : 'bg-sand/60 text-taupe/70 grayscale dark:bg-cocoa dark:text-sand/40'
      }`}
    >
      <Icon icon={icon} width={36} aria-hidden="true" />
      {!earned && (
        <span className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full border-2 border-cream bg-taupe text-cream dark:border-espresso">
          <Icon icon="solar:lock-keyhole-minimalistic-bold" width={13} aria-hidden="true" />
        </span>
      )}
    </span>
  )
}

function AwardDetail({ award }: { award: Award }) {
  return (
    <>
      <DialogHeader className="items-center text-center">
        <BadgeIcon icon={award.badge.icon} earned />
        <DialogTitle className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink dark:text-cream">{award.badge.title}</DialogTitle>
        <DialogDescription className="text-taupe dark:text-sand/70">{award.badge.description}</DialogDescription>
      </DialogHeader>
      <dl className="mt-2 space-y-3 rounded-2xl bg-sand/40 p-4 text-sm dark:bg-cocoa/60">
        <Row label="Earned on" value={dateFormat.format(award.earnedAt)} />
        <Row label={award.course.kind === 'foundation' ? 'Foundation' : 'Track'} value={award.course.title} />
        {award.course.streamTitle && <Row label="Stream" value={award.course.streamTitle} />}
        <Row label="Attempt" value={`#${award.attempt.number} (v${award.attempt.version}, ${ATTEMPT_STATUS[award.attempt.status]})`} />
        {award.badge.howToEarn && <Row label="Awarded for" value={award.badge.howToEarn} />}
      </dl>
      <DialogFooter className="m-0 mt-2 gap-2 border-0 bg-transparent p-0 sm:justify-end">
        <DialogClose className="rounded-full px-5 py-2.5 text-sm font-medium text-taupe transition-colors duration-150 hover:text-ink dark:text-sand/70 dark:hover:text-cream">
          Close
        </DialogClose>
        <Link href={courseHref(award.course)} className={darkPill}>
          Open course
          <Icon icon="solar:arrow-right-linear" width={16} aria-hidden="true" />
        </Link>
      </DialogFooter>
    </>
  )
}

function LockedDetail({ badge }: { badge: LockedBadge }) {
  return (
    <>
      <DialogHeader className="items-center text-center">
        <BadgeIcon icon={badge.icon} earned={false} />
        <DialogTitle className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink dark:text-cream">{badge.title}</DialogTitle>
        <DialogDescription className="text-taupe dark:text-sand/70">{badge.description}</DialogDescription>
      </DialogHeader>
      <div className="mt-2 rounded-2xl bg-sand/40 p-4 text-sm dark:bg-cocoa/60">
        <p className="font-semibold text-ink dark:text-cream">How to earn it</p>
        <p className="mt-1 text-taupe dark:text-sand/70">{badge.howToEarn || 'Keep learning to unlock it.'}</p>
      </div>
      <DialogFooter className="m-0 mt-2 gap-2 border-0 bg-transparent p-0 sm:justify-end">
        <DialogClose className={darkPill}>Got it</DialogClose>
      </DialogFooter>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-taupe dark:text-sand/60">{label}</dt>
      <dd className="text-right font-medium text-ink dark:text-cream">{value}</dd>
    </div>
  )
}
