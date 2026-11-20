import { redirect } from 'next/navigation'
import { requireAppUser } from '@/lib/auth/app-user'
import { getApplicationForUser, LEARNER_ROUTES } from '@/lib/learner/applications'

export const metadata = { title: 'Learner dashboard' }

export default async function LearnerDashboardPage() {
  const user = await requireAppUser()
  const application = await getApplicationForUser(user.id)

  if (!application) redirect(LEARNER_ROUTES.apply)
  if (application.status !== 'approved') redirect(LEARNER_ROUTES.status)

  return (
    <main className="mx-auto max-w-5xl px-6 py-20">
      <h1 className="font-display text-5xl font-medium tracking-tight text-ink dark:text-cream">Welcome in.</h1>
      <p className="mt-3 text-taupe dark:text-sand/70">Your application is approved. Your learning dashboard lives here.</p>
    </main>
  )
}
