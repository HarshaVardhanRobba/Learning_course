import { notFound } from 'next/navigation'
import { attemptNumberSchema, getTrackTopic, trackSlugSchema } from '@workspace/core'
import { TopicScreen } from '@/components/learner/topic-screen'
import { requireApprovedLearner } from '@/lib/learner'
import { LEARNER_ROUTES } from '@/lib/routes'

export const metadata = { title: 'Topic' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function TrackTopicPage({ params, searchParams }: PageProps<'/learner/tracks/[slug]/topics/[topicId]'>) {
  const { user } = await requireApprovedLearner()
  const { slug: rawSlug, topicId } = await params
  const slug = trackSlugSchema.safeParse(rawSlug)
  if (!slug.success || !UUID.test(topicId)) notFound()

  const query = await searchParams
  const attempt = query.attempt === undefined ? undefined : attemptNumberSchema.safeParse(query.attempt)
  if (attempt && !attempt.success) notFound()

  // The topic must belong to the version of the learner's selected attempt on this track; anything
  // else is a 404. Locked topics (or a track before the foundation) only show the reason.
  const view = await getTrackTopic(user.id, slug.data, topicId, attempt?.data)
  if (view.kind === 'not_found') notFound()

  const courseTitle = view.kind === 'topic' ? view.courseTitle : 'Track'
  return <TopicScreen view={view} courseTitle={courseTitle} mapHref={LEARNER_ROUTES.track(slug.data, attempt?.data)} />
}
