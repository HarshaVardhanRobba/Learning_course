import { notFound, redirect } from 'next/navigation'
import { attemptNumberSchema, trackSlugSchema } from '@workspace/core'
import { TopicScreen } from '@/components/learner/topic-screen'
import { requireApprovedLearner } from '@/lib/learner'
import { LEARNER_ROUTES } from '@/lib/routes'
import { caller } from '@/trpc/server'

export const metadata = { title: 'Topic' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function TrackTopicPage({ params, searchParams }: PageProps<'/learner/tracks/[slug]/topics/[topicId]'>) {
  await requireApprovedLearner()
  const { slug: rawSlug, topicId } = await params
  const slug = trackSlugSchema.safeParse(rawSlug)
  if (!slug.success || !UUID.test(topicId)) notFound()

  const query = await searchParams
  const attempt = query.attempt === undefined ? undefined : attemptNumberSchema.safeParse(query.attempt)
  if (attempt && !attempt.success) notFound()

  // The topic must belong to the version of the learner's selected attempt on this track; anything
  // else is a 404. Locked topics (or a track before the foundation) only show the reason.
  const view = await caller.learner.trackTopic({ slug: slug.data, topicId, attempt: attempt?.data })
  if (view.kind === 'not_found') notFound()
  if (view.kind === 'topic' && view.topic.lessons.length > 0) {
    // Opening a topic continues at its first uncovered lesson in the lesson viewer.
    const next = view.topic.lessons.find((l) => !l.done) ?? view.topic.lessons[0]!
    redirect(LEARNER_ROUTES.lesson(next.id, view.editable ? undefined : view.attempt.attemptNumber))
  }

  const courseTitle = view.kind === 'topic' ? view.courseTitle : 'Track'
  return <TopicScreen view={view} courseTitle={courseTitle} mapHref={LEARNER_ROUTES.track(slug.data, attempt?.data)} />
}
