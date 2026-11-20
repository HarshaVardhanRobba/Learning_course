'use client'

import * as React from 'react'
import { DURATION, EASE, getGsap, prefersReducedMotion } from '@/lib/motion/gsap'

export function RevealSection({
  children,
  className,
  y = 32,
  stagger = 0.08,
}: {
  children: React.ReactNode
  className?: string
  y?: number
  stagger?: number
}) {
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (prefersReducedMotion() || !ref.current) return

    const { gsap, ScrollTrigger } = getGsap()
    const targets = ref.current.querySelectorAll('[data-reveal]')
    if (targets.length === 0) return

    const tween = gsap.fromTo(
      targets,
      { y, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: DURATION.reveal,
        ease: EASE,
        stagger,
        scrollTrigger: {
          trigger: ref.current,
          start: 'top 80%',
        },
      },
    )

    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [y, stagger])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
