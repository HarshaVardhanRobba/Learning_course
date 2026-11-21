import Link from 'next/link'
import { Icon } from '@iconify/react'
import type { LessonNavTarget, VideoPlayback } from '@workspace/core'

/**
 * The dark stage at the top of the lesson viewer. Videos play through a signed Cloudflare Stream token
 * minted on the server for this request; the player is created without download controls.
 */
export function VideoStage({
  title,
  video,
  previous,
  next,
  hrefFor,
}: {
  title: string
  video: VideoPlayback | null
  previous: LessonNavTarget
  next: LessonNavTarget
  hrefFor: (lessonId: string) => string
}) {
  return (
    <div className="relative bg-espresso">
      <div className="mx-auto aspect-video max-h-[calc(100dvh-14rem)] w-full max-w-[min(100%,calc((100dvh-14rem)*16/9))]">
        {video?.state === 'ready' ? (
          <iframe
            src={video.iframeUrl}
            title={`Video: ${title}`}
            className="size-full border-0"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <StagePlaceholder title={title} video={video} />
        )}
      </div>

      <StageArrow side="left" target={previous} hrefFor={hrefFor} />
      <StageArrow side="right" target={next} hrefFor={hrefFor} />
    </div>
  )
}

function StagePlaceholder({ title, video }: { title: string; video: Exclude<VideoPlayback, { state: 'ready' }> | null }) {
  const content = !video
    ? { icon: 'solar:book-2-linear', heading: title, body: 'Reading lesson. Scroll down for the material.', tone: 'text-gold-soft' }
    : video.state === 'processing'
      ? {
          icon: 'svg-spinners:ring-resize',
          heading: 'This video is still processing',
          body: video.percent !== null ? `${video.percent}% done. Check back in a few minutes.` : 'Check back in a few minutes.',
          tone: 'text-gold-soft',
        }
      : video.state === 'failed'
        ? { icon: 'solar:danger-triangle-linear', heading: 'This video couldn’t be processed', body: video.message, tone: 'text-rose-300' }
        : { icon: 'solar:videocamera-record-linear', heading: 'Video unavailable', body: video.message, tone: 'text-sand/70' }

  return (
    <div role={video ? 'status' : undefined} className="grid size-full place-items-center px-10 py-4 text-center sm:px-16">
      <div>
        <Icon icon={content.icon} width={48} className={`mx-auto size-9 sm:size-12 ${content.tone}`} aria-hidden="true" />
        <p className="mt-3 line-clamp-2 font-display text-xl font-semibold text-cream sm:mt-4 sm:text-3xl">{content.heading}</p>
        <p className="mx-auto mt-2 line-clamp-2 max-w-md text-xs text-sand/70 sm:text-sm">{content.body}</p>
      </div>
    </div>
  )
}

function StageArrow({
  side,
  target,
  hrefFor,
}: {
  side: 'left' | 'right'
  target: LessonNavTarget
  hrefFor: (lessonId: string) => string
}) {
  if (!target || target.locked) return null
  const label = `${side === 'left' ? 'Previous' : 'Next'} lesson: ${target.title}`
  return (
    <Link
      href={hrefFor(target.id)}
      aria-label={label}
      title={label}
      className={`absolute top-1/2 grid h-12 w-8 -translate-y-1/2 place-items-center border border-gold-soft/40 bg-gold text-espresso shadow-lg transition-[width,background-color] duration-150 ease-out hover:w-10 hover:bg-gold-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/40 ${
        side === 'left' ? 'left-0 rounded-r-lg' : 'right-0 rounded-l-lg'
      }`}
    >
      <Icon icon={side === 'left' ? 'lucide:chevron-left' : 'lucide:chevron-right'} width={20} strokeWidth={2.5} aria-hidden="true" />
    </Link>
  )
}
