import type { EnrollmentStatus } from '@workspace/db'
import type { EnrollmentWithVersion, TopicOutline } from './learning.repository'

export type AttemptProgress = {
  enrollmentId: string
  courseId: string
  attemptNumber: number
  status: EnrollmentStatus
  startedAt: Date
  endedAt: Date | null
  version: number
  versionTitle: string
  totalTopics: number
  completedTopics: number
  totalPhases: number
  completedPhases: number
  /** Floored, so 100 only when every topic is done. */
  percent: number
  isComplete: boolean
  nextTopic: { id: string; title: string; phaseTitle: string } | null
}

/**
 * Progress comes only from completion rows stored for this attempt, measured against the topics of
 * the version the attempt started on. Nothing here trusts client state.
 */
export function computeAttemptProgress(
  enrollment: EnrollmentWithVersion,
  outlines: TopicOutline[],
  completedTopicIds: ReadonlySet<string>,
): AttemptProgress {
  const versionTopics = outlines.filter((t) => t.versionId === enrollment.courseVersionId)

  const phaseTotals = new Map<string, { total: number; done: number }>()
  let completedTopics = 0
  let nextTopic: AttemptProgress['nextTopic'] = null

  for (const topic of versionTopics) {
    const done = completedTopicIds.has(topic.topicId)
    const phase = phaseTotals.get(topic.phaseId) ?? { total: 0, done: 0 }
    phase.total += 1
    if (done) {
      phase.done += 1
      completedTopics += 1
    } else if (!nextTopic) {
      nextTopic = { id: topic.topicId, title: topic.topicTitle, phaseTitle: topic.phaseTitle }
    }
    phaseTotals.set(topic.phaseId, phase)
  }

  const totalTopics = versionTopics.length
  const completedPhases = [...phaseTotals.values()].filter((p) => p.done === p.total).length
  const isComplete = totalTopics > 0 && completedTopics === totalTopics

  return {
    enrollmentId: enrollment.id,
    courseId: enrollment.courseId,
    attemptNumber: enrollment.attemptNumber,
    status: enrollment.status,
    startedAt: enrollment.startedAt,
    endedAt: enrollment.endedAt,
    version: enrollment.version,
    versionTitle: enrollment.versionTitle,
    totalTopics,
    completedTopics,
    totalPhases: phaseTotals.size,
    completedPhases,
    percent: totalTopics ? Math.floor((completedTopics / totalTopics) * 100) : 0,
    isComplete,
    nextTopic,
  }
}

/** Groups completion rows by attempt for `computeAttemptProgress`. */
export function groupCompletions(rows: { enrollmentId: string; topicId: string }[]): Map<string, Set<string>> {
  const byEnrollment = new Map<string, Set<string>>()
  for (const row of rows) {
    const set = byEnrollment.get(row.enrollmentId) ?? new Set<string>()
    set.add(row.topicId)
    byEnrollment.set(row.enrollmentId, set)
  }
  return byEnrollment
}
