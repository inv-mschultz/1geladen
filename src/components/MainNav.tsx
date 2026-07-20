'use client'

import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'

const SECTIONS = ['info', 'mitbringen', 'pinnwand', 'fotos'] as const
type SectionId = (typeof SECTIONS)[number]

export function MainNav({ labels }: { labels: Record<SectionId, string> }) {
  const pathname = usePathname()
  // Tagged with the path it was observed on, so a stale section from the
  // previous page is ignored on navigation without resetting state in an effect.
  const [active, setActive] = useState<{ path: string; id: SectionId } | null>(null)
  const activeId = active?.path === pathname ? active.id : null

  // Anchor links only make sense where an event view is rendered
  const hasEventView = pathname === '/' || /^\/events\/(?!new$)[^/]+$/.test(pathname)

  useEffect(() => {
    const elements = SECTIONS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    )
    if (elements.length === 0) return

    const visible = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }
        const current = SECTIONS.find((id) => visible.has(id))
        if (current) setActive({ path: pathname, id: current })
      },
      // Top offset matches the sticky header; a section counts as "current"
      // once it enters the upper half of the viewport.
      { rootMargin: '-92px 0px -50% 0px' },
    )
    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [pathname])

  if (!hasEventView) return null

  return (
    <nav className="site-mainnav">
      {SECTIONS.map((id) => (
        <a
          key={id}
          href={`#${id}`}
          className={activeId === id ? 'is-active' : ''}
          onClick={() => setActive({ path: pathname, id })}
        >
          {labels[id]}
        </a>
      ))}
    </nav>
  )
}
