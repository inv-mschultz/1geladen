'use client'

import { useRouter } from 'next/navigation'
import React, { useEffect, useRef, useState, useTransition } from 'react'

import { createEvent, updateEvent } from '@/app/(frontend)/actions'
import type { Dictionary } from '@/i18n/dictionaries'
import { PLATFORM_ACCENT, themeTokens } from '@/lib/theme'
import { ColorField } from './ColorField'

export type EventFormValues = {
  id: number
  title: string
  dateIso: string
  locationName?: string | null
  street?: string | null
  zip?: string | null
  city?: string | null
  themeColor?: string | null
  accentColor?: string | null
  accentColorLight?: string | null
  description: string
}

const pad = (n: number) => String(n).padStart(2, '0')

// Keeps password managers and browser autofill away from event fields
const noAutofill = {
  autoComplete: 'off',
  'data-1p-ignore': '',
  'data-lpignore': 'true',
  'data-bwignore': '',
  'data-form-type': 'other',
} as const

/** Strict "TT.MM.JJJJ" + "HH:MM" → Date. Must be real, future, and 2026+.
 *  Date and time report their validity separately so the error can say
 *  which one is actually wrong. */
function parseEventDate(
  date: string,
  time: string,
): { value: Date | null; dateOk: boolean; timeOk: boolean } {
  const tm = /^(\d{1,2}):(\d{2})$/.exec(time.trim())
  const timeOk = Boolean(tm && Number(tm[1]) <= 23 && Number(tm[2]) <= 59)

  const dm = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(date.trim())
  let dateOk = false
  let value: Date | null = null
  if (dm) {
    const [day, month, year] = [Number(dm[1]), Number(dm[2]), Number(dm[3])]
    const hours = timeOk ? Number(tm![1]) : 19
    const minutes = timeOk ? Number(tm![2]) : 0
    const parsed = new Date(year, month - 1, day, hours, minutes)
    // Reject rollovers like 31.02. (Date silently wraps them into March)
    dateOk =
      year >= 2026 &&
      parsed.getDate() === day &&
      parsed.getMonth() === month - 1 &&
      parsed.getTime() > Date.now()
    if (dateOk && timeOk) value = parsed
  }
  return { value, dateOk, timeOk }
}

export function EventForm({
  dict,
  event,
  light = false,
}: {
  dict: Dictionary['eventForm']
  event?: EventFormValues
  light?: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [dateError, setDateError] = useState(false)
  const [timeError, setTimeError] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const formRef = useRef<HTMLFormElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [themeColor, setThemeColor] = useState(event?.themeColor || '#4ce6a5')
  const [accentColor, setAccentColor] = useState(event?.accentColor || '#ff8ad4')
  const [accentColorLight, setAccentColorLight] = useState(
    event?.accentColorLight || event?.accentColor || PLATFORM_ACCENT,
  )
  // Drawer-local preview polarity so the admin can tune both modes
  const [previewLight, setPreviewLight] = useState(light)

  // Reads current form values; returns null if the required fields aren't valid
  const buildFormData = (): FormData | null => {
    const form = formRef.current
    if (!form) return null
    const formData = new FormData(form)
    const { value, dateOk, timeOk } = parseEventDate(
      String(formData.get('date') ?? ''),
      String(formData.get('time') ?? ''),
    )
    setDateError(!dateOk)
    setTimeError(!timeOk)
    if (!String(formData.get('title') ?? '').trim() || !value) return null
    formData.set('dateIso', value.toISOString())
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

  // Edit mode: live-preview the colors on the page behind the drawer, in the
  // drawer's preview polarity. Cleanup falls back to the server-rendered theme.
  useEffect(() => {
    if (!event) return
    const tokens = themeTokens(
      themeColor,
      previewLight ? accentColorLight : accentColor,
      previewLight,
    )
    for (const [key, value] of Object.entries(tokens)) {
      document.documentElement.style.setProperty(key, value)
    }
    return () => {
      for (const key of Object.keys(tokens)) {
        document.documentElement.style.removeProperty(key)
      }
    }
  }, [event, themeColor, accentColor, accentColorLight, previewLight])

  // Initial date/time in the browser's timezone, not the server's
  const initial = event ? new Date(event.dateIso) : null
  const initialDate = initial
    ? `${pad(initial.getDate())}.${pad(initial.getMonth() + 1)}.${initial.getFullYear()}`
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
          {...noAutofill}
          className="input"
        />
      </label>

      <div className="event-form__row">
        <label className="field">
          <span>{dict.date}</span>
          <input
            name="date"
            type="text"
            inputMode="numeric"
            required
            placeholder={dict.datePlaceholder}
            defaultValue={initialDate}
            {...noAutofill}
            className={`input ${dateError ? 'input--invalid' : ''}`}
          />
        </label>
        <label className="field">
          <span>{dict.time}</span>
          <input
            name="time"
            type="text"
            inputMode="numeric"
            required
            placeholder={dict.timePlaceholder}
            defaultValue={initialTime}
            {...noAutofill}
            className={`input ${timeError ? 'input--invalid' : ''}`}
          />
        </label>
      </div>
      {dateError && <p className="event-form__hint event-form__hint--error">{dict.dateInvalid}</p>}
      {timeError && <p className="event-form__hint event-form__hint--error">{dict.timeInvalid}</p>}

      <label className="field">
        <span>{dict.locationName}</span>
        <input
          name="locationName"
          type="text"
          maxLength={120}
          defaultValue={event?.locationName ?? ''}
          placeholder={dict.locationPlaceholder}
          {...noAutofill}
          className="input"
        />
      </label>

      <label className="field">
        <span>{dict.street}</span>
        <input name="street" type="text" maxLength={120} defaultValue={event?.street ?? ''} {...noAutofill} className="input" />
      </label>
      <div className="event-form__row event-form__row--zip">
        <label className="field">
          <span>{dict.zip}</span>
          <input name="zip" type="text" inputMode="numeric" maxLength={10} defaultValue={event?.zip ?? ''} {...noAutofill} className="input" />
        </label>
        <label className="field">
          <span>{dict.city}</span>
          <input name="city" type="text" maxLength={120} defaultValue={event?.city ?? ''} {...noAutofill} className="input" />
        </label>
      </div>

      <label className="field">
        <span>{dict.description}</span>
        <textarea name="description" rows={5} maxLength={2000} defaultValue={event?.description} {...noAutofill} className="input" />
      </label>

      {event ? (
        <section className="event-form__section">
          <div className="event-form__section-head">
            <h3>{dict.colors}</h3>
            <div className="mode-switch" role="group" aria-label={dict.colors}>
              <button
                type="button"
                className={`mode-switch__btn ${!previewLight ? 'is-active' : ''}`}
                onClick={() => setPreviewLight(false)}
              >
                {dict.modeDark}
              </button>
              <button
                type="button"
                className={`mode-switch__btn ${previewLight ? 'is-active' : ''}`}
                onClick={() => setPreviewLight(true)}
              >
                {dict.modeLight}
              </button>
            </div>
          </div>
          <div className="event-form__row event-form__row--colors">
            <ColorField
              label={dict.color}
              name="themeColor"
              value={themeColor}
              customLabel={dict.customColor}
              onChange={(hex) => {
                setThemeColor(hex)
                scheduleSave()
              }}
            />
            <ColorField
              label={dict.accent}
              name="accentColor"
              value={accentColor}
              customLabel={dict.customColor}
              onChange={(hex) => {
                setAccentColor(hex)
                scheduleSave()
              }}
            />
            <ColorField
              label={dict.accentLight}
              name="accentColorLight"
              value={accentColorLight}
              customLabel={dict.customColor}
              onChange={(hex) => {
                setAccentColorLight(hex)
                scheduleSave()
              }}
            />
          </div>
        </section>
      ) : (
        <p className="event-form__hint">{dict.colorsHint}</p>
      )}

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
