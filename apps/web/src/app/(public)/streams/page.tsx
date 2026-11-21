import { Icon } from '@iconify/react'
import Link from 'next/link'
import tracksData from '@workspace/db/learning-tracks.json'
import { ExploreTabs, type ExploreData, type RoadmapStep } from '@/components/marketing/explore-tabs'
import { RevealWords } from '@/components/marketing/reveal-text'
import { RevealSection } from '@/components/marketing/reveal-section'
import { goldText } from '@/lib/styles'

export const metadata = { title: 'Streams' }

const CATALOG_FEATURES = [
  { icon: 'solar:map-linear', label: 'One shared foundation' },
  { icon: 'solar:routing-2-linear', label: '4 streams, 26 roles' },
  { icon: 'solar:clipboard-check-linear', label: 'Quizzes & assessments' },
  { icon: 'solar:cup-star-linear', label: 'Capstone projects' },
]

type SheetTopic = { title: string; description: string }
type SheetTrack = { slug: string; title: string; topics: SheetTopic[] }
type Sheet = { foundation: SheetTrack; streams: { slug: string; title: string; tracks: SheetTrack[] }[] }

/** Example roadmaps: a short excerpt of two real tracks, with demo progress states. */
const ROADMAP_EXAMPLES = [
  { stream: 'full-stack', track: 'java-full-stack-developer' },
  { stream: 'cyber-security', track: 'soc-analyst-l1-l2' },
]
const DEMO_STATES: RoadmapStep['state'][] = ['completed', 'completed', 'current', 'locked', 'locked']

/** Built on the server from the same data the course database is seeded from; only small slices reach the client. */
function buildExploreData(sheet: Sheet): ExploreData {
  const allTracks = sheet.streams.flatMap((s) => s.tracks)
  return {
    foundationTopics: sheet.foundation.topics.map((t) => t.title),
    streams: sheet.streams.map((s) => ({ slug: s.slug, title: s.title, tracks: s.tracks.map((t) => t.title) })),
    totalTracks: allTracks.length,
    roadmaps: ROADMAP_EXAMPLES.flatMap(({ stream, track }) => {
      const s = sheet.streams.find((x) => x.slug === stream)
      const t = s?.tracks.find((x) => x.slug === track)
      if (!s || !t) return []
      return [
        {
          streamTitle: s.title,
          trackTitle: t.title,
          steps: t.topics.slice(0, DEMO_STATES.length).map((topic, i) => ({
            title: topic.title,
            description: topic.description,
            state: DEMO_STATES[i]!,
          })),
          remaining: Math.max(0, t.topics.length - DEMO_STATES.length),
        },
      ]
    }),
  }
}

export default function StreamsPage() {
  const data = buildExploreData(tracksData as Sheet)

  return (
    <main>
      <section className="px-4 pt-2 lg:px-6">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-espresso px-8 py-16 sm:px-12 lg:px-16 lg:py-20">
          <div
            aria-hidden="true"
            className="absolute -right-24 -top-24 size-[28rem] rounded-full bg-[radial-gradient(closest-side,rgba(227,194,143,0.22),transparent)]"
          />

          <nav aria-label="Breadcrumb" className="relative flex items-center gap-2 text-xs text-sand/60">
            <Link href="/" className="transition-colors duration-150 hover:text-cream">
              Home
            </Link>
            <Icon icon="solar:alt-arrow-right-linear" width={12} />
            <span aria-current="page" className="text-sand/90">
              Streams
            </span>
          </nav>

          <div className="relative mt-8 max-w-2xl">
            <h1 className="font-display text-[clamp(2.75rem,6vw,4.75rem)] font-medium leading-[1] tracking-tight text-cream">
              <RevealWords as="span" className="block" text="Discover our" />
              <RevealWords as="span" className="block" wordClassName={goldText} text="learning streams" delay={0.08} />
            </h1>
            <p className="mt-6 max-w-md leading-relaxed text-sand/75">
              Start with a shared foundation, then specialise in the role you want — topic by topic, with quizzes, phase
              assessments and a capstone that proves it.
            </p>
          </div>

          <RevealSection className="relative mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
            {CATALOG_FEATURES.map((feature) => (
              <div key={feature.label} data-reveal className="flex items-center gap-3 bg-espresso/90 px-5 py-4 backdrop-blur-md">
                <Icon icon={feature.icon} width={22} className="shrink-0 text-gold-soft" />
                <span className="text-sm text-sand/85">{feature.label}</span>
              </div>
            ))}
          </RevealSection>
        </div>
      </section>

      <ExploreTabs data={data} />
    </main>
  )
}
