'use client'

import * as React from 'react'

/**
 * The sidebar's own scroll area, independent of the page scroll. `data-lenis-prevent` stops the page's
 * smooth-scroll from swallowing wheel events here. On load, the current lesson is scrolled into view
 * inside this panel only (never moving the page).
 */
export function SidebarScroller({ className, children }: { className: string; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const panel = ref.current
    const current = panel?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!panel || !current) return
    const offset = current.getBoundingClientRect().top - panel.getBoundingClientRect().top
    panel.scrollTop += offset - panel.clientHeight / 3
  }, [])

  return (
    <div ref={ref} data-lenis-prevent className={className}>
      {children}
    </div>
  )
}
