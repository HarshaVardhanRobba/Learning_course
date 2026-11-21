/**
 * Pure progression rules for a course map. Every page and every mutation computes node states from
 * here on the server, so the browser never decides what is unlocked.
 *
 * Rules:
 * - Phase 1 is unlocked. Each later phase unlocks once every topic in the phase before it is completed.
 * - Inside an unlocked phase, topics can be done in any order.
 * - A topic is COMPLETED when its topic quiz is passed (a topic_completions row exists),
 *   IN_PROGRESS once any of its lessons is covered, otherwise AVAILABLE.
 * - A phase assessment is available only when every topic quiz in that phase has been passed.
 */

export type NodeState = 'locked' | 'available' | 'in_progress' | 'completed'

export type ContentLesson = { id: string; topicId: string; position: number; title: string; content: string }
export type ContentTopic = { id: string; phaseId: string; position: number; title: string; description: string }
export type ContentPhase = { id: string; position: number; title: string }

export type VersionContent = { phases: ContentPhase[]; topics: ContentTopic[]; lessons: ContentLesson[] }

export type AttemptActivity = {
  lessonCompletions: { lessonId: string; completedAt: Date }[]
  topicCompletions: { topicId: string; completedAt: Date }[]
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
  assessmentAvailable: boolean
  lockedReason: string | null
}

export type CourseMap = {
  phases: MapPhase[]
  totalTopics: number
  completedTopics: number
  percent: number
  isComplete: boolean
  currentTopicId: string | null
}

export function buildCourseMap(content: VersionContent, activity: AttemptActivity): CourseMap {
  const doneLessons = new Map(activity.lessonCompletions.map((l) => [l.lessonId, l.completedAt]))
  const doneTopics = new Set(activity.topicCompletions.map((t) => t.topicId))

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
    const lockedReason = unlocked ? null : `Complete every topic in “${previous!.title}” to unlock this phase.`

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
    const allDone = topics.length > 0 && completedTopics === topics.length
    const state: NodeState = !unlocked
      ? 'locked'
      : allDone
        ? 'completed'
        : topics.some((t) => t.state !== 'available')
          ? 'in_progress'
          : 'available'

    const mapPhase: MapPhase = { ...phase, state, topics, completedTopics, assessmentAvailable: allDone, lockedReason }
    phases.push(mapPhase)
    previous = mapPhase
  }

  const allTopics = phases.flatMap((p) => p.topics)
  const current = pickCurrentTopic(allTopics, doneLessons)
  if (current) current.isCurrent = true

  const completedTopics = allTopics.filter((t) => t.state === 'completed').length
  return {
    phases,
    totalTopics: allTopics.length,
    completedTopics,
    percent: allTopics.length ? Math.floor((completedTopics / allTopics.length) * 100) : 0,
    isComplete: allTopics.length > 0 && completedTopics === allTopics.length,
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

export function findTopic(map: CourseMap, topicId: string): { phase: MapPhase; topic: MapTopic } | null {
  for (const phase of map.phases) {
    const topic = phase.topics.find((t) => t.id === topicId)
    if (topic) return { phase, topic }
  }
  return null
}
