import type { EnrollmentStatus } from '@workspace/db'
import type { CourseMap } from './course-map'
import type { EnrollmentWithVersion } from './learning.repository'

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
  /** Over topics and phase assessments; 100 only when everything is passed. */
  percent: number
  isComplete: boolean
  nextTopic: { id: string; title: string; phaseTitle: string } | null
}

/**
 * Dashboard summary of one attempt, derived from the same server-side course map as the learning pages
 * (completion rows of this attempt against its own course version). Nothing here trusts client state.
 */
export function summarizeAttempt(enrollment: EnrollmentWithVersion, map: CourseMap): AttemptProgress {
  const next = map.phases
    .flatMap((phase) => phase.topics.map((topic) => ({ phase, topic })))
    .find(({ topic }) => topic.state === 'available' || topic.state === 'in_progress')

  return {
    enrollmentId: enrollment.id,
    courseId: enrollment.courseId,
    attemptNumber: enrollment.attemptNumber,
    status: enrollment.status,
    startedAt: enrollment.startedAt,
    endedAt: enrollment.endedAt,
    version: enrollment.version,
    versionTitle: enrollment.versionTitle,
    totalTopics: map.totalTopics,
    completedTopics: map.completedTopics,
    totalPhases: map.phases.length,
    completedPhases: map.phases.filter((p) => p.state === 'completed').length,
    percent: map.percent,
    isComplete: map.isComplete,
    nextTopic: next ? { id: next.topic.id, title: next.topic.title, phaseTitle: next.phase.title } : null,
  }
}
