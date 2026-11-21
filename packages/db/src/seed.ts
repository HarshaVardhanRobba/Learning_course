/**
 * Seeds published sample courses and badge definitions. Idempotent: a course or badge whose slug
 * already exists is left untouched. Run with `npm run db:seed -w @workspace/db`.
 */
import { config } from 'dotenv'
import { Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import * as schema from './schema'
import type { CourseKind } from './schema'

config({ path: '../../apps/web/.env.local' })

type SeedCourse = {
  slug: string
  kind: CourseKind
  sortOrder: number
  title: string
  summary: string
  phases: { title: string; topics: string[] }[]
}

const COURSES: SeedCourse[] = [
  {
    slug: 'common-foundation',
    kind: 'foundation',
    sortOrder: 0,
    title: 'Common Foundation',
    summary: 'The shared groundwork every learner completes before choosing a career path.',
    phases: [
      { title: 'How the web works', topics: ['Clients and servers', 'HTTP in practice', 'Browsers and rendering'] },
      { title: 'Working like an engineer', topics: ['The command line', 'Version control with Git', 'Reading documentation'] },
      { title: 'Programming fundamentals', topics: ['Values and types', 'Control flow', 'Functions', 'Data structures'] },
    ],
  },
  {
    slug: 'frontend-development',
    kind: 'career_path',
    sortOrder: 10,
    title: 'Frontend Development',
    summary: 'Build accessible, responsive interfaces with modern component frameworks.',
    phases: [
      { title: 'Layout and styling', topics: ['Semantic HTML', 'Flexbox and Grid', 'Responsive design'] },
      { title: 'Components', topics: ['React fundamentals', 'State and effects', 'Forms'] },
      { title: 'Shipping', topics: ['Testing UI', 'Performance', 'Capstone project'] },
    ],
  },
  {
    slug: 'backend-development',
    kind: 'career_path',
    sortOrder: 20,
    title: 'Backend Development',
    summary: 'Design APIs, model data, and run reliable services in production.',
    phases: [
      { title: 'Servers and APIs', topics: ['Routing', 'REST design', 'Authentication'] },
      { title: 'Data', topics: ['SQL basics', 'Schema design', 'Migrations'] },
      { title: 'Production', topics: ['Observability', 'Background jobs', 'Capstone project'] },
    ],
  },
  {
    slug: 'data-analytics',
    kind: 'career_path',
    sortOrder: 30,
    title: 'Data Analytics',
    summary: 'Turn raw data into decisions with SQL, statistics, and clear visualisation.',
    phases: [
      { title: 'Querying', topics: ['Filtering and joins', 'Aggregation', 'Window functions'] },
      { title: 'Analysis', topics: ['Descriptive statistics', 'Experiment basics'] },
      { title: 'Communication', topics: ['Charts that work', 'Dashboards', 'Capstone report'] },
    ],
  },
]

const BADGES = [
  { slug: 'first-topic', title: 'First step', description: 'Completed your first topic.', icon: 'solar:star-linear' },
  { slug: 'first-phase', title: 'Phase cleared', description: 'Completed a full phase.', icon: 'solar:flag-linear' },
  {
    slug: 'foundation-complete',
    title: 'Foundation complete',
    description: 'Finished the Common Foundation.',
    icon: 'solar:medal-ribbon-star-linear',
  },
  {
    slug: 'career-path-complete',
    title: 'Path finisher',
    description: 'Completed a career path.',
    icon: 'solar:cup-star-linear',
  },
]

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED
  if (!url) throw new Error('DATABASE_URL_UNPOOLED is not set. Run `neon env pull` in apps/web.')
  const pool = new Pool({ connectionString: url })
  const db = drizzle(pool, { schema })

  try {
    await db.transaction(async (tx) => {
      for (const c of COURSES) {
        const [course] = await tx
          .insert(schema.courses)
          .values({ slug: c.slug, kind: c.kind, sortOrder: c.sortOrder })
          .onConflictDoNothing({ target: schema.courses.slug })
          .returning()
        if (!course) {
          console.log(`skip course ${c.slug} (exists)`)
          continue
        }

        const [version] = await tx
          .insert(schema.courseVersions)
          .values({
            courseId: course.id,
            version: 1,
            status: 'published',
            title: c.title,
            summary: c.summary,
            publishedAt: new Date(),
          })
          .returning()

        for (const [phaseIndex, p] of c.phases.entries()) {
          const [phase] = await tx
            .insert(schema.phases)
            .values({ courseVersionId: version!.id, position: phaseIndex + 1, title: p.title })
            .returning()
          await tx
            .insert(schema.topics)
            .values(p.topics.map((title, i) => ({ phaseId: phase!.id, position: i + 1, title })))
        }
        console.log(`seeded course ${c.slug}`)
      }

      await tx.insert(schema.badges).values(BADGES).onConflictDoNothing({ target: schema.badges.slug })
    })
    console.log('done')
  } finally {
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
