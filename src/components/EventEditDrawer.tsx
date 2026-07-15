'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import type { Dictionary } from '@/i18n/dictionaries'
import { EventForm, type EventFormValues } from './EventForm'
import { X } from './icons'

export function EventEditDrawer({
  label,
  dict,
  event,
}: {
  label: string
  dict: Dictionary['eventForm']
  event: EventFormValues
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Portal target only exists in the browser
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open])

  if (!mounted) return null

  // Rendered at <body> so the fixed FAB and drawer escape the event card's
  // transformed (animated) ancestor and sit in the page chrome instead.
  return createPortal(
    <>
      <button type="button" className="fab-edit" onClick={() => setOpen(true)}>
        {label}
      </button>

      {open && (
        <div className="drawer" role="dialog" aria-modal="true" aria-label={dict.editTitle}>
          <div className="drawer__backdrop" onClick={() => setOpen(false)} />
          <div className="drawer__panel">
            <div className="drawer__head">
              <h2 className="drawer__title">{dict.editTitle}</h2>
              <button
                type="button"
                className="btn-quiet"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <X />
              </button>
            </div>
            {/* key resets the form (and its live preview) per open */}
            <EventForm key={String(open)} dict={dict} event={event} />
          </div>
        </div>
      )}
    </>,
    document.body,
  )
}
