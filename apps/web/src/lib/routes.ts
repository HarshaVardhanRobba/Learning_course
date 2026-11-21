const withAttempt = (path: string, attempt?: number) => (attempt ? `${path}?attempt=${attempt}` : path)

export const LEARNER_ROUTES = {
  apply: '/learner/application',
  status: '/learner/application-status',
  dashboard: '/learner/dashboard',
  foundation: '/learner/foundation',
  foundationTopic: (topicId: string) => `/learner/foundation/topics/${topicId}`,
  track: (slug: string, attempt?: number) => withAttempt(`/learner/tracks/${slug}`, attempt),
  trackTopic: (slug: string, topicId: string, attempt?: number) =>
    withAttempt(`/learner/tracks/${slug}/topics/${topicId}`, attempt),
  lesson: (lessonId: string, attempt?: number) => withAttempt(`/learner/lessons/${lessonId}`, attempt),
  /** Protected resource endpoint: checks access, then redirects to a short-lived URL. */
  resource: (resourceId: string) => `/learner/resources/${resourceId}`,
  achievements: '/learner/achievements',
  history: '/learner/history',
} as const

/** Map and topic URLs for a course, so shared screens work for the foundation and every track. */
export function courseRoutes(course: { kind: 'foundation' | 'track'; slug: string }) {
  return course.kind === 'foundation'
    ? {
        map: (_attempt?: number) => LEARNER_ROUTES.foundation,
        topic: (topicId: string, _attempt?: number) => LEARNER_ROUTES.foundationTopic(topicId),
      }
    : {
        map: (attempt?: number) => LEARNER_ROUTES.track(course.slug, attempt),
        topic: (topicId: string, attempt?: number) => LEARNER_ROUTES.trackTopic(course.slug, topicId, attempt),
      }
}

export const ADMIN_ROUTES = {
  dashboard: '/admin/dashboard',
} as const
