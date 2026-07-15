'use client'

import React, { useState, useTransition } from 'react'

import { createEvent } from '@/app/(frontend)/actions'
import type { Dictionary } from '@/i18n/dictionaries'

export function EventForm({ dict }: { dict: Dictionary['eventForm'] }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

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
          placeholder={dict.namePlaceholder}
          className="input"
        />
      </label>

      <div className="event-form__row">
        <label className="field">
          <span>{dict.date}</span>
          <input name="date" type="date" required className="input" />
        </label>
        <label className="field">
          <span>{dict.time}</span>
          <input name="time" type="time" defaultValue="19:00" required className="input" />
        </label>
      </div>

      <div className="event-form__row">
        <label className="field">
          <span>{dict.locationName}</span>
          <input
            name="locationName"
            type="text"
            maxLength={120}
            placeholder={dict.locationPlaceholder}
            className="input"
          />
        </label>
        <label className="field">
          <span>{dict.address}</span>
          <input name="address" type="text" maxLength={200} className="input" />
        </label>
      </div>

      <div className="event-form__row">
        <label className="field">
          <span>{dict.mapsUrl}</span>
          <input name="mapsUrl" type="url" className="input" />
        </label>
        <label className="field">
          <span>{dict.color}</span>
          <input name="themeColor" type="color" defaultValue="#4ce6a5" className="input input--color" />
        </label>
      </div>

      <div className="event-form__row">
        <label className="field">
          <span>{dict.accent}</span>
          <input name="accentColor" type="color" defaultValue="#ff8ad4" className="input input--color" />
        </label>
        <span />
      </div>

      <label className="field">
        <span>{dict.description}</span>
        <textarea name="description" rows={5} maxLength={2000} className="input" />
      </label>

      {error && <p className="auth-form__error">{error}</p>}

      <button type="submit" className="btn btn--big btn--yes event-form__submit" disabled={pending}>
        {dict.submit}
      </button>
    </form>
  )
}
