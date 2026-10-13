'use client'

import React, { useState } from 'react'

import type { StoryCopy } from '@/i18n/story'

/** Slight tilts and paper colours, so the notes look stuck on by hand. */
const TILTS = [-1.2, 0.8, -0.6, 1.2, -1, 0.6]
const PAPERS = ['pink', 'green', 'plum', 'green', 'plum', 'pink']

/**
 * The FAQ as sticky notes. Each question flips over to its answer; the
 * emoji are just stickers.
 */
export function Faq({ t }: { t: StoryCopy['faq'] }) {
  const [open, setOpen] = useState<Set<number>>(new Set())

  const flip = (index: number) =>
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })

  return (
    <div className="story-board story__reveal">
      <p className="story-board__hint micro">{t.hint}</p>
      <div className="story-board__notes">
        {t.faq.map((item, index) => {
          const isOpen = open.has(index)
          return (
            <button
              key={item.q}
              type="button"
              className={`story-board__note story-board__note--${PAPERS[index % PAPERS.length]} ${isOpen ? 'is-open' : ''}`}
              style={{ '--tilt': `${TILTS[index % TILTS.length]}deg`, '--n': index } as React.CSSProperties}
              aria-expanded={isOpen}
              onClick={() => flip(index)}
            >
              <span className="story-board__face story-board__face--front">
                <span className="story-board__sticker" aria-hidden>
                  {item.sticker}
                </span>
                <span className="story-board__q">{item.q}</span>
              </span>
              <span className="story-board__face story-board__face--back">
                <span className="story-board__q story-board__q--small">{item.q}</span>
                <span className="story-board__a">{item.a}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
