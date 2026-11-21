export const LEARNER_ROUTES = {
  apply: '/learner/application',
  status: '/learner/application-status',
  dashboard: '/learner/dashboard',
  achievements: '/learner/achievements',
  history: '/learner/history',
  learn: (enrollmentId: string) => `/learner/learn/${enrollmentId}`,
} as const

export const ADMIN_ROUTES = {
  dashboard: '/admin/dashboard',
} as const
