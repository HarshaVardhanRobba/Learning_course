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
  lessonIdSchema,
  trackSlugSchema,
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
export {
  completeLessonById,
  getLessonView,
  getResourceUrl,
  setLessonCompletion,
  type LessonNavTarget,
  type LessonResourceView,
  type LessonView,
} from './learning/lesson.service'
export type { VideoPlayback } from './media/media.service'
export {
  getQuizView,
  startQuizAttempt,
  submitQuizAnswer,
  type AnswerFeedback,
  type CorrectAnswer,
  type PublicQuestion,
  type QuizHistoryEntry,
  type QuizResult,
  type QuizView,
  type StartQuizResult,
  type SubmitAnswerResult,
} from './learning/quiz.service'
export {
  quizAnswerSchema,
  submitQuizAnswerSchema,
  type QuizAnswerInput,
  type SubmitQuizAnswerInput,
} from './learning/quiz.schema'
export { normalizeAnswer } from './learning/quiz-answer'
export {
  getAssessmentView,
  submitAssessment,
  type AssessmentHistoryEntry,
  type AssessmentResult,
  type AssessmentView,
  type SubmitAssessmentResult,
} from './learning/assessment.service'
export { submitAssessmentSchema, type SubmitAssessmentInput } from './learning/assessment.schema'
export { getAchievements, type Achievements, type BadgeAward, type BadgeInfo } from './learning/achievements.service'
export {
  HISTORY_PAGE_SIZE,
  getAttemptDetail,
  listHistory,
  type AttemptDetail,
  type HistoryPage,
  type HistoryRow,
} from './learning/history.service'
export { historyFilterSchema, historyListSchema, type HistoryFilter } from './learning/history.schema'
