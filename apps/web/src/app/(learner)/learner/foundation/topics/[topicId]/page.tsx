import { notFound } from 'next/navigation'
import { getFoundationTopic } from '@workspace/core'
import { TopicScreen } from '@/components/learner/topic-screen'
import { requireApprovedLearner } from '@/lib/learner'
import { LEARNER_ROUTES } from '@/lib/routes'

export const metadata = { title: 'Topic' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function FoundationTopicPage({ params }: PageProps<'/learner/foundation/topics/[topicId]'>) {
  const { user } = await requireApprovedLearner()
  const { topicId } = await params
  if (!UUID.test(topicId)) notFound()

  // Unlock rules are evaluated on the server for the learner's own attempt; a direct URL to a locked
  // topic only gets the reason, and a topic from another version is a 404.
  const view = await getFoundationTopic(user.id, topicId)
  if (view.kind === 'not_found') notFound()

  return <TopicScreen view={view} courseTitle="Common Foundation" mapHref={LEARNER_ROUTES.foundation} />
}
