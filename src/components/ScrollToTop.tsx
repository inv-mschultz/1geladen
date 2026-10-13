'use client'

import { useEffect } from 'react'

/**
 * Next only scrolls on navigation when the new page's top is out of view.
 * Coming from the bottom of a long page to a short one, the browser just
 * clamps the old offset and the page opens a little scrolled down. Pages
 * that should always open at the top render this.
 */
export function ScrollToTop() {
  useEffect(() => {
    if (!window.location.hash) window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])
  return null
}
