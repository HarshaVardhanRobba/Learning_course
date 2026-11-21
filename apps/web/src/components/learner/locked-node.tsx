'use client'

import { Icon } from '@iconify/react'
import { Popover, PopoverContent, PopoverTrigger } from '@workspace/ui/components/popover'

/** Locked nodes never link anywhere; tapping one explains what unlocks it. */
export function LockedNode({
  title,
  reason,
  className,
  children,
}: {
  title: string
  reason: string
  className: string
  children: React.ReactNode
}) {
  return (
    <Popover>
      <PopoverTrigger className={className} aria-label={`${title} (locked). Show why`}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        side="top"
        sideOffset={10}
        className="w-64 rounded-2xl border border-sand bg-cream p-4 text-ink shadow-lg ring-0 dark:border-cocoa dark:bg-espresso dark:text-cream"
      >
        <p className="flex items-center gap-2 font-semibold">
          <Icon icon="solar:lock-keyhole-minimalistic-linear" width={16} aria-hidden="true" className="text-gold" />
          {title} is locked
        </p>
        <p className="text-sm leading-relaxed text-taupe dark:text-sand/70">{reason}</p>
      </PopoverContent>
    </Popover>
  )
}
