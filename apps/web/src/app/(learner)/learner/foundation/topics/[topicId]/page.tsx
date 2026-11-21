import { notFound, redirect } from 'next/navigation'
import { TopicScreen } from '@/components/learner/topic-screen'
import { requireApprovedLearner } from '@/lib/learner'
import { LEARNER_ROUTES } from '@/lib/routes'
import { caller } from '@/trpc/server'

export const metadata = { title: 'Topic' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function FoundationTopicPage({ params }: PageProps<'/learner/foundation/topics/[topicId]'>) {
  await requireApprovedLearner()
  const { topicId } = await params
  if (!UUID.test(topicId)) notFound()

  // Unlock rules are evaluated on the server for the learner's own attempt; a direct URL to a locked
  // topic only gets the reason, and a topic from another version is a 404.
  const view = await caller.learner.foundationTopic({ topicId })
  if (view.kind === 'not_found') notFound()
  if (view.kind === 'topic' && view.topic.lessons.length > 0) {
    // Opening a topic continues at its first uncovered lesson in the lesson viewer.
    const next = view.topic.lessons.find((l) => !l.done) ?? view.topic.lessons[0]!
    redirect(LEARNER_ROUTES.lesson(next.id, view.editable ? undefined : view.attempt.attemptNumber))
  }

  return <TopicScreen view={view} courseTitle="Common Foundation" mapHref={LEARNER_ROUTES.foundation} />
}
