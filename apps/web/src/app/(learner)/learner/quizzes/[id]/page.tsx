import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Icon } from '@iconify/react'
import { attemptNumberSchema, lessonIdSchema } from '@workspace/core'
import { QuizRunner } from '@/components/learner/quiz/quiz-runner'
import { card } from '@/components/learner/course-progress'
import { requireApprovedLearner } from '@/lib/learner'
import { courseRoutes } from '@/lib/routes'
import { darkPill } from '@/lib/styles'
import { getQueryClient, HydrateClient, trpc } from '@/trpc/server'

export const metadata = { title: 'Topic quiz' }

export default async function QuizPage({ params, searchParams }: PageProps<'/learner/quizzes/[id]'>) {
  // Clerk session -> app user -> approved application in Neon. The learner.quiz procedures enforce the same
  // gate plus attempt ownership, course version and topic unlock rules.
  await requireApprovedLearner()
  const id = lessonIdSchema.safeParse((await params).id)
  if (!id.success) notFound()
  const raw = (await searchParams).attempt
  const attempt = raw === undefined ? undefined : attemptNumberSchema.safeParse(raw)
  if (attempt && !attempt.success) notFound()

  const input = { quizId: id.data, attempt: attempt?.data }
  // Fetched into the request's query client, then hydrated so the client runner starts with this data.
  const view = await getQueryClient().fetchQuery(trpc.learner.quiz.get.queryOptions(input))
  if (view.kind === 'not_found') notFound()

  if (view.kind === 'locked') {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 sm:px-6 sm:pt-8">
        <section className={`${card} mt-6 px-5 py-10 text-center sm:px-6 sm:py-12`}>
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-sand/60 text-taupe dark:bg-cocoa dark:text-sand/70">
            <Icon icon="solar:lock-keyhole-minimalistic-linear" width={34} />
          </span>
          <h1 className="mt-6 break-words font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl dark:text-cream">{view.title} is locked</h1>
          <p className="mx-auto mt-3 max-w-md text-taupe dark:text-sand/70">{view.reason}</p>
          <Link href={courseRoutes(view.course).map()} className={`${darkPill} mt-7 px-6 py-3`}>
            <Icon icon="solar:map-linear" width={16} />
            Back to the map
          </Link>
        </section>
      </main>
    )
  }

  return (
    <HydrateClient>
      <QuizRunner input={input} />
    </HydrateClient>
  )
}
