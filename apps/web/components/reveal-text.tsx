'use client'

import * as React from 'react'
import { DURATION, EASE, getGsap, prefersReducedMotion } from '@/lib/motion/gsap'

export function RevealWords({
  text,
  as: Tag = 'span',
  className,
  wordClassName,
  delay = 0,
}: {
  text: string
  as?: React.ElementType
  className?: string
  wordClassName?: string
  delay?: number
}) {
  const ref = React.useRef<HTMLElement>(null)
  const words = text.split(' ')

  React.useEffect(() => {
    if (prefersReducedMotion() || !ref.current) return

    const { gsap } = getGsap()
    const targets = ref.current.querySelectorAll('[data-word]')

    const tween = gsap.fromTo(
      targets,
      { yPercent: 120, opacity: 0 },
      {
        yPercent: 0,
        opacity: 1,
        duration: DURATION.hero,
        ease: EASE,
        stagger: 0.06,
        delay,
      },
    )

    return () => {
      tween.kill()
    }
  }, [delay])

  return (
    <Tag ref={ref} aria-label={text} className={className}>
      {words.map((word, i) => (
        <span
          key={i}
          className="inline-block overflow-hidden align-top pb-[0.15em] mb-[-0.15em]"
          aria-hidden="true"
        >
          <span data-word className={`inline-block will-change-transform ${wordClassName ?? ''}`}>
            {word}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        </span>
      ))}
    </Tag>
  )
}
