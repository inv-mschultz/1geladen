'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'

import { setViewAsGuest } from '@/app/(frontend)/actions'
import type { Dictionary } from '@/i18n/dictionaries'
import { useMounted } from '@/lib/useMounted'
import { EventForm, type EventFormValues } from './EventForm'
import { X } from './icons'

export function AdminDock({
  viewAsGuest,
  canEdit,
  editLabel,
  viewLabels,
  dict,
  event,
  light = false,
}: {
  viewAsGuest: boolean
  canEdit: boolean
  editLabel: string
  viewLabels: { admin: string; guest: string }
  dict: Dictionary['eventForm']
  event: EventFormValues
  light?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const mounted = useMounted()

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

  const setView = (guest: boolean) => {
    if (guest === viewAsGuest || pending) return
    startTransition(() => setViewAsGuest(guest))
  }

  // Portaled to <body> so the fixed dock escapes the event card's animated
  // (transformed) ancestor and sits in the page chrome.
  return createPortal(
    <>
      <div className="admin-dock">
        <div className="view-switch" role="group" aria-label="View as">
          <button
            type="button"
            className={`view-switch__btn ${!viewAsGuest ? 'is-active' : ''}`}
            onClick={() => setView(false)}
          >
            {viewLabels.admin}
          </button>
          <button
            type="button"
            className={`view-switch__btn ${viewAsGuest ? 'is-active' : ''}`}
            onClick={() => setView(true)}
          >
            {viewLabels.guest}
          </button>
        </div>
        {canEdit && (
          <button type="button" className="fab-edit" onClick={() => setOpen(true)}>
            {editLabel}
          </button>
        )}
      </div>

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
            <EventForm key={String(open)} dict={dict} event={event} light={light} />
          </div>
        </div>
      )}
    </>,
    document.body,
  )
}
