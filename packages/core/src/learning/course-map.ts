/**
 * Pure progression rules for a course map. Every page and every mutation computes node states from
 * here on the server, so the browser never decides what is unlocked.
 *
 * Rules:
 * - Phase 1 is unlocked. Each later phase unlocks once the phase before it is COMPLETED.
 * - Inside an unlocked phase, topics can be done in any order.
 * - A topic is COMPLETED when its topic quiz is passed (a topic_completions row exists),
 *   IN_PROGRESS once any of its lessons is covered, otherwise AVAILABLE.
 * - A phase assessment is available only when every topic quiz in that phase has been passed.
 * - A phase is COMPLETED when its assessment is passed (a phase_completions row exists). A phase without
 *   an assessment is completed once every topic is.
 * - The course is complete when every phase is completed.
 */

export type NodeState = 'locked' | 'available' | 'in_progress' | 'completed'

export type ContentLesson = {
  id: string
  topicId: string
  position: number
  title: string
  content: string
  contentFormat: 'markdown' | 'rich_text'
  videoUid: string | null
  durationSeconds: number | null
}
export type ContentTopic = { id: string; phaseId: string; position: number; title: string; description: string }
export type ContentPhase = { id: string; position: number; title: string }

export type VersionContent = {
  phases: ContentPhase[]
  topics: ContentTopic[]
  lessons: ContentLesson[]
  assessments: { id: string; phaseId: string }[]
}

export type AttemptActivity = {
  lessonCompletions: { lessonId: string; completedAt: Date }[]
  topicCompletions: { topicId: string; completedAt: Date }[]
  phaseCompletions: { phaseId: string; completedAt: Date }[]
}

export type MapLesson = ContentLesson & { done: boolean }

export type MapTopic = ContentTopic & {
  state: NodeState
  lessons: MapLesson[]
  lessonsDone: number
  isCurrent: boolean
  /** Why the topic cannot be opened; null unless locked. */
  lockedReason: string | null
}

export type MapPhase = ContentPhase & {
  state: NodeState
  topics: MapTopic[]
  completedTopics: number
  /** Every topic quiz in the phase is passed. */
  topicsComplete: boolean
  assessmentId: string | null
  /** Unlocked, all topic quizzes passed, and an assessment exists. */
  assessmentAvailable: boolean
  assessmentPassed: boolean
  lockedReason: string | null
}

export type CourseMap = {
  phases: MapPhase[]
  totalTopics: number
  completedTopics: number
  /** Over topics plus phase assessments, so 100% only when everything is passed. */
  percent: number
  isComplete: boolean
  currentTopicId: string | null
}

export function buildCourseMap(content: VersionContent, activity: AttemptActivity): CourseMap {
  const doneLessons = new Map(activity.lessonCompletions.map((l) => [l.lessonId, l.completedAt]))
  const doneTopics = new Set(activity.topicCompletions.map((t) => t.topicId))
  const donePhases = new Set(activity.phaseCompletions.map((p) => p.phaseId))
  const assessmentByPhase = new Map(content.assessments.map((a) => [a.phaseId, a.id]))

  const lessonsByTopic = new Map<string, MapLesson[]>()
  for (const lesson of [...content.lessons].sort((a, b) => a.position - b.position)) {
    const list = lessonsByTopic.get(lesson.topicId) ?? []
    list.push({ ...lesson, done: doneLessons.has(lesson.id) })
    lessonsByTopic.set(lesson.topicId, list)
  }

  const phases: MapPhase[] = []
  let previous: MapPhase | undefined
  for (const phase of [...content.phases].sort((a, b) => a.position - b.position)) {
    const unlocked = !previous || previous.state === 'completed'
    const lockedReason = unlocked
      ? null
      : previous!.assessmentId
        ? `Pass every topic quiz and the phase assessment in “${previous!.title}” to unlock this phase.`
        : `Complete every topic in “${previous!.title}” to unlock this phase.`

    const topics: MapTopic[] = content.topics
      .filter((t) => t.phaseId === phase.id)
      .sort((a, b) => a.position - b.position)
      .map((topic) => {
        const lessons = lessonsByTopic.get(topic.id) ?? []
        const lessonsDone = lessons.filter((l) => l.done).length
        const state: NodeState = !unlocked
          ? 'locked'
          : doneTopics.has(topic.id)
            ? 'completed'
            : lessonsDone > 0
              ? 'in_progress'
              : 'available'
        return { ...topic, state, lessons, lessonsDone, isCurrent: false, lockedReason }
      })

    const completedTopics = topics.filter((t) => t.state === 'completed').length
    const topicsComplete = topics.length > 0 && completedTopics === topics.length
    const assessmentId = assessmentByPhase.get(phase.id) ?? null
    const assessmentPassed = unlocked && !!assessmentId && donePhases.has(phase.id)
    const phaseDone = topicsComplete && (assessmentId ? assessmentPassed : true)
    const state: NodeState = !unlocked
      ? 'locked'
      : phaseDone
        ? 'completed'
        : topicsComplete || topics.some((t) => t.state !== 'available')
          ? 'in_progress'
          : 'available'

    const mapPhase: MapPhase = {
      ...phase,
      state,
      topics,
      completedTopics,
      topicsComplete,
      assessmentId,
      assessmentAvailable: unlocked && topicsComplete && !!assessmentId,
      assessmentPassed,
      lockedReason,
    }
    phases.push(mapPhase)
    previous = mapPhase
  }

  const allTopics = phases.flatMap((p) => p.topics)
  const current = pickCurrentTopic(allTopics, doneLessons)
  if (current) current.isCurrent = true

  const completedTopics = allTopics.filter((t) => t.state === 'completed').length
  const units = allTopics.length + phases.filter((p) => p.assessmentId).length
  const doneUnits = completedTopics + phases.filter((p) => p.assessmentPassed).length
  return {
    phases,
    totalTopics: allTopics.length,
    completedTopics,
    percent: units ? Math.floor((doneUnits / units) * 100) : 0,
    isComplete: phases.length > 0 && allTopics.length > 0 && phases.every((p) => p.state === 'completed'),
    currentTopicId: current?.id ?? null,
  }
}

/** The in-progress topic touched most recently, otherwise the first available topic in map order. */
function pickCurrentTopic(topics: MapTopic[], doneLessons: Map<string, Date>): MapTopic | undefined {
  let latest: { topic: MapTopic; at: number } | undefined
  for (const topic of topics) {
    if (topic.state !== 'in_progress') continue
    for (const lesson of topic.lessons) {
      const at = doneLessons.get(lesson.id)?.getTime()
      if (at !== undefined && (!latest || at > latest.at)) latest = { topic, at }
    }
  }
  return latest?.topic ?? topics.find((t) => t.state === 'available')
}

/** Every lesson in map order, with its topic's lock state, for previous/next navigation. */
export function flattenLessons(map: CourseMap): { lesson: MapLesson; topic: MapTopic; phase: MapPhase }[] {
  return map.phases.flatMap((phase) => phase.topics.flatMap((topic) => topic.lessons.map((lesson) => ({ lesson, topic, phase }))))
}

export function findPhase(map: CourseMap, phaseId: string): MapPhase | null {
  return map.phases.find((p) => p.id === phaseId) ?? null
}

export function findTopic(map: CourseMap, topicId: string): { phase: MapPhase; topic: MapTopic } | null {
  for (const phase of map.phases) {
    const topic = phase.topics.find((t) => t.id === topicId)
    if (topic) return { phase, topic }
  }
  return null
}
