'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

// The sticky header's height depends on how its rows wrap, so sticky elements
// that pin below it (RSVP nudge bar) read it from --header-h instead of a constant.
// It also marks the header once the page is scrolled, so it only draws its
// bottom line when there is content passing beneath it. A page that snaps
// its first section up under the header (the story) marks itself with
// data-header-rest, and the header counts as at rest until you pass that.
export function HeaderMeasure() {
  // Re-run on navigation: the new page may start at a different offset.
  const pathname = usePathname()
  useEffect(() => {
    const header = document.querySelector<HTMLElement>('.site-header')
    if (!header) return
    const apply = () =>
      document.documentElement.style.setProperty('--header-h', `${header.offsetHeight}px`)
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(header)

    const mark = () => {
      const rest = document.querySelector<HTMLElement>('[data-header-rest]')
      const from = rest ? rest.getBoundingClientRect().top + window.scrollY : 0
      header.toggleAttribute('data-scrolled', window.scrollY > from + 2)
    }
    mark()
    window.addEventListener('scroll', mark, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', mark)
    }
  }, [pathname])
  return null
}
