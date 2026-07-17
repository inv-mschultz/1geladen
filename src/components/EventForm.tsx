'use client'

import { useRouter } from 'next/navigation'
import React, { useEffect, useRef, useState, useTransition } from 'react'

import { createEvent, updateEvent } from '@/app/(frontend)/actions'
import type { Dictionary } from '@/i18n/dictionaries'
import { themeTokens } from '@/lib/theme'

export type EventFormValues = {
  id: number
  title: string
  dateIso: string
  locationName?: string | null
  address?: string | null
  themeColor?: string | null
  accentColor?: string | null
  invertTheme?: boolean | null
  description: string
}

const pad = (n: number) => String(n).padStart(2, '0')

export function EventForm({
  dict,
  event,
}: {
  dict: Dictionary['eventForm']
  event?: EventFormValues
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const formRef = useRef<HTMLFormElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [themeColor, setThemeColor] = useState(event?.themeColor || '#4ce6a5')
  const [accentColor, setAccentColor] = useState(event?.accentColor || '#ff8ad4')
  const [invert, setInvert] = useState(Boolean(event?.invertTheme))

  // Reads current form values; returns null if the required fields aren't valid
  const buildFormData = (): FormData | null => {
    const form = formRef.current
    if (!form) return null
    const formData = new FormData(form)
    const date = String(formData.get('date') ?? '')
    const time = String(formData.get('time') ?? '19:00')
    const local = new Date(`${date}T${time || '19:00'}`)
    if (!String(formData.get('title') ?? '').trim() || !date || Number.isNaN(local.getTime())) {
      return null
    }
    formData.set('dateIso', local.toISOString())
    return formData
  }

  // Edit mode: persist every change (debounced) — no save button.
  const scheduleSave = () => {
    if (!event) return
    if (timer.current) clearTimeout(timer.current)
    setStatus('saving')
    timer.current = setTimeout(() => {
      const formData = buildFormData()
      if (!formData) {
        setStatus('idle')
        return
      }
      startTransition(async () => {
        const result = await updateEvent(event.id, formData)
        if (result?.error) {
          setError(dict.error)
          setStatus('idle')
          return
        }
        setError(null)
        router.refresh()
        setStatus('saved')
      })
    }, 600)
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  // Edit mode: live-preview the colors on the page behind the drawer.
  // Cleanup falls back to the server-rendered theme (unsaved picks revert).
  useEffect(() => {
    if (!event) return
    const tokens = themeTokens(themeColor, accentColor, invert)
    for (const [key, value] of Object.entries(tokens)) {
      document.documentElement.style.setProperty(key, value)
    }
    return () => {
      for (const key of Object.keys(tokens)) {
        document.documentElement.style.removeProperty(key)
      }
    }
  }, [event, themeColor, accentColor, invert])

  // Initial date/time in the browser's timezone, not the server's
  const initial = event ? new Date(event.dateIso) : null
  const initialDate = initial
    ? `${initial.getFullYear()}-${pad(initial.getMonth() + 1)}-${pad(initial.getDate())}`
    : ''
  const initialTime = initial ? `${pad(initial.getHours())}:${pad(initial.getMinutes())}` : '19:00'

  return (
    <form
      ref={formRef}
      className="event-form"
      onInput={event ? scheduleSave : undefined}
      onSubmit={(e) => {
        e.preventDefault()
        if (event || pending) return // edit mode auto-saves; only create submits
        setError(null)
        const formData = buildFormData()
        if (!formData) {
          setError(dict.error)
          return
        }
        startTransition(async () => {
          const result = await createEvent(formData)
          if (result?.error) setError(dict.error)
        })
      }}
    >
      <label className="field">
        <span>{dict.name}</span>
        <input
          name="title"
          type="text"
          required
          maxLength={120}
          defaultValue={event?.title}
          placeholder={dict.namePlaceholder}
          autoComplete="off"
          className="input"
        />
      </label>

      <div className="event-form__row">
        <label className="field">
          <span>{dict.date}</span>
          <input name="date" type="date" required defaultValue={initialDate} className="input" />
        </label>
        <label className="field">
          <span>{dict.time}</span>
          <input name="time" type="time" defaultValue={initialTime} required className="input" />
        </label>
      </div>

      <div className="event-form__row">
        <label className="field">
          <span>{dict.locationName}</span>
          <input
            name="locationName"
            type="text"
            maxLength={120}
            defaultValue={event?.locationName ?? ''}
            placeholder={dict.locationPlaceholder}
            autoComplete="off"
            className="input"
          />
        </label>
        <label className="field">
          <span>{dict.address}</span>
          <input name="address" type="text" maxLength={200} defaultValue={event?.address ?? ''} autoComplete="off" className="input" />
        </label>
      </div>

      <div className="event-form__row">
        <label className="field">
          <span>{dict.color}</span>
          <input name="themeColor" type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="input input--color" />
        </label>
        <label className="field">
          <span>{dict.accent}</span>
          <input name="accentColor" type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="input input--color" />
        </label>
      </div>

      <label className="field field--check">
        <input
          name="invertTheme"
          type="checkbox"
          checked={invert}
          onChange={(e) => setInvert(e.target.checked)}
        />
        <span>{dict.invert}</span>
      </label>

      <label className="field">
        <span>{dict.description}</span>
        <textarea name="description" rows={5} maxLength={2000} defaultValue={event?.description} autoComplete="off" className="input" />
      </label>

      {error && <p className="auth-form__error">{error}</p>}

      {event ? (
        <p className="event-form__status" aria-live="polite">
          {status === 'saving' ? dict.saving : status === 'saved' ? dict.saved : ''}
        </p>
      ) : (
        <button type="submit" className="btn btn--big btn--yes event-form__submit" disabled={pending}>
          {dict.submit}
        </button>
      )}
    </form>
  )
}
