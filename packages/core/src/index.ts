export { findOrCreateUserByClerkId } from './users/user.repository'
export { findApplicationByUserId, type ApplicationWithReview } from './applications/application.repository'
export {
  countApplicationsByStatus,
  decideApplication,
  listApplications,
  submitApplication,
  type DecisionResult,
  type SubmitResult,
} from './applications/application.service'
export {
  applicationDecisionSchema,
  applicationInputSchema,
  type ApplicationDecision,
  type ApplicationField,
  type ApplicationInput,
} from './applications/application.schema'
export {
  getLearnerDashboard,
  hasCompletedFoundation,
  startAttempt,
  type DashboardCourse,
  type DashboardStream,
  type HistoryEvent,
  type LearnerDashboard,
  type LearningStatus,
  type StartAttemptResult,
} from './learning/learning.service'
export type { AttemptProgress } from './learning/progress'
export type { EarnedBadge } from './learning/learning.repository'
export {
  attemptNumberSchema,
  completeLessonSchema,
  completeTopicSchema,
  startAttemptSchema,
  trackSlugSchema,
  type StartAttemptInput,
} from './learning/learning.schema'
export {
  completeLesson,
  completeTopic,
  getFoundationMap,
  getFoundationTopic,
  getTrackMap,
  getTrackTopic,
  type AttemptInfo,
  type CourseHeader,
  type CourseMapView,
  type ProgressResult,
  type TopicView,
} from './learning/course-learning.service'
export type { CourseMap, MapLesson, MapPhase, MapTopic, NodeState } from './learning/course-map'
