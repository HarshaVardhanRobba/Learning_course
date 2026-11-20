import { redirect } from 'next/navigation'
import { getClerkProfile, requireAppUser } from '@workspace/auth'
import { findApplicationByUserId } from '@workspace/core'
import { ApplicationForm } from '@/components/application/application-form'
import { LEARNER_ROUTES } from '@/lib/routes'

export const metadata = { title: 'Apply to Join' }

const STEPS = ['Submit this short form', 'An administrator reviews it', 'You get access once approved']

export default async function ApplyPage() {
  const user = await requireAppUser()
  if (await findApplicationByUserId(user.id)) redirect(LEARNER_ROUTES.status)

  const profile = await getClerkProfile()

  return (
    <main className="mx-auto w-full max-w-3xl px-6 pb-20 pt-8">
      <div className="border-b border-sand pb-6 dark:border-cocoa">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl dark:text-cream">Apply to Join</h1>
        <p className="mt-3 max-w-xl leading-relaxed text-taupe dark:text-sand/70">
          Every learner is approved by an administrator before learning access opens. Tell us who you are and
          we’ll review your application.
        </p>
        <ol className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-taupe dark:text-sand/70">
          {STEPS.map((step, i) => (
            <li key={step} className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-full bg-gold/15 text-xs font-semibold text-gold">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <section className="mt-8 rounded-[1.75rem] border border-sand bg-white/70 p-6 sm:p-10 dark:border-cocoa dark:bg-cocoa/40">
        <ApplicationForm
          defaults={{ firstName: profile?.firstName ?? '', lastName: profile?.lastName ?? '', email: profile?.email ?? '' }}
        />
      </section>
    </main>
  )
}
