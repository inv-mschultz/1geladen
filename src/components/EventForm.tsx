'use client'

import { useRouter } from 'next/navigation'
import React, { useEffect, useState, useTransition } from 'react'

import { createEvent, updateEvent } from '@/app/(frontend)/actions'
import type { Dictionary } from '@/i18n/dictionaries'
import { themeTokens } from '@/lib/theme'

export type EventFormValues = {
  id: number
  title: string
  dateIso: string
  locationName?: string | null
  address?: string | null
  mapsUrl?: string | null
  themeColor?: string | null
  accentColor?: string | null
  description: string
}

const pad = (n: number) => String(n).padStart(2, '0')

export function EventForm({
  dict,
  event,
  onSaved,
}: {
  dict: Dictionary['eventForm']
  event?: EventFormValues
  onSaved?: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [themeColor, setThemeColor] = useState(event?.themeColor || '#4ce6a5')
  const [accentColor, setAccentColor] = useState(event?.accentColor || '#ff8ad4')

  // Edit mode: live-preview the colors on the page behind the drawer.
  // Cleanup falls back to the server-rendered theme (unsaved picks revert).
  useEffect(() => {
    if (!event) return
    const tokens = themeTokens(themeColor, accentColor)
    for (const [key, value] of Object.entries(tokens)) {
      document.documentElement.style.setProperty(key, value)
    }
    return () => {
      for (const key of Object.keys(tokens)) {
        document.documentElement.style.removeProperty(key)
      }
    }
  }, [event, themeColor, accentColor])

  // Initial date/time in the browser's timezone, not the server's
  const initial = event ? new Date(event.dateIso) : null
  const initialDate = initial
    ? `${initial.getFullYear()}-${pad(initial.getMonth() + 1)}-${pad(initial.getDate())}`
    : ''
  const initialTime = initial ? `${pad(initial.getHours())}:${pad(initial.getMinutes())}` : '19:00'

  return (
    <form
      className="event-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (pending) return
        setError(null)
        const formData = new FormData(e.currentTarget)
        const date = String(formData.get('date') ?? '')
        const time = String(formData.get('time') ?? '19:00')
        const local = new Date(`${date}T${time || '19:00'}`)
        if (!date || Number.isNaN(local.getTime())) {
          setError(dict.error)
          return
        }
        formData.set('dateIso', local.toISOString())
        startTransition(async () => {
          if (event) {
            const result = await updateEvent(event.id, formData)
            if (result?.error) {
              setError(dict.error)
              return
            }
            router.refresh()
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
            onSaved?.()
          } else {
            const result = await createEvent(formData)
            if (result?.error) setError(dict.error)
          }
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
            className="input"
          />
        </label>
        <label className="field">
          <span>{dict.address}</span>
          <input name="address" type="text" maxLength={200} defaultValue={event?.address ?? ''} className="input" />
        </label>
      </div>

      <div className="event-form__row">
        <label className="field">
          <span>{dict.mapsUrl}</span>
          <input name="mapsUrl" type="url" defaultValue={event?.mapsUrl ?? ''} className="input" />
        </label>
        <label className="field">
          <span>{dict.color}</span>
          <input name="themeColor" type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="input input--color" />
        </label>
      </div>

      <div className="event-form__row">
        <label className="field">
          <span>{dict.accent}</span>
          <input name="accentColor" type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="input input--color" />
        </label>
        <span />
      </div>

      <label className="field">
        <span>{dict.description}</span>
        <textarea name="description" rows={5} maxLength={2000} defaultValue={event?.description} className="input" />
      </label>

      {error && <p className="auth-form__error">{error}</p>}

      <button type="submit" className="btn btn--big btn--yes event-form__submit" disabled={pending}>
        {saved ? '✓' : event ? dict.save : dict.submit}
      </button>
    </form>
  )
}
