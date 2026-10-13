'use client'

import React, { useState } from 'react'

import { Check } from '@/components/icons'
import type { StoryCopy } from '@/i18n/story'

type Status = 'yes' | 'maybe' | 'no'

/** Avatar tones, so the guest list reads as a crowd, not a column of clones. */
const TONES = ['#ff8ad4', '#e8e8e8', '#ffd36e', '#a58bff', '#ffb38a', '#8ad8ff', '#ff6f9f']

const GUESTS: { name: string; status: Status }[] = [
  { name: 'Lena', status: 'yes' },
  { name: 'Tobi', status: 'yes' },
  { name: 'Jonas', status: 'yes' },
  { name: 'Kemal', status: 'yes' },
  { name: 'Ayşe', status: 'maybe' },
  { name: 'Mia', status: 'maybe' },
  { name: 'Paul', status: 'no' },
]

function Chip({ name, tone, you }: { name: string; tone: string; you?: boolean }) {
  return (
    <li className={`story-chip ${you ? 'is-you' : ''}`}>
      <span className="story-chip__avatar" style={{ background: tone }} aria-hidden>
        {name[0]}
      </span>
      <span>{name}</span>
    </li>
  )
}

/**
 * A pretend event page, laid out like the real one: the three answers and
 * the guest list on one side, the bring list on the other. Answering puts
 * "you" on the list, and open items can be claimed. Nothing is sent anywhere.
 */
export function EventDemo({ rsvp, bring }: { rsvp: StoryCopy['rsvp']; bring: StoryCopy['kitchen'] }) {
  const [answer, setAnswer] = useState<Status | null>(null)
  const [mine, setMine] = useState<Set<string>>(new Set())
  const statuses: Status[] = ['yes', 'maybe', 'no']
  const tone = (name: string) => TONES[GUESTS.findIndex((g) => g.name === name) % TONES.length] ?? TONES[0]

  const toggle = (name: string) =>
    setMine((current) => {
      const next = new Set(current)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  const taken = bring.items.filter((item) => item.by || mine.has(item.name)).length

  return (
    <div className="story-event">
      <span className="story-card__tag">{rsvp.tryIt}</span>
      <header className="story-event__head">
        <p className="story-event__title">{rsvp.event}</p>
        <p className="story-event__meta">{rsvp.eventMeta}</p>
      </header>

      <div className="story-event__cols">
        <section className="story-event__col">
          <div className="story-event__answers" role="group" aria-label={rsvp.event}>
            {statuses.map((status) => (
              <button
                key={status}
                type="button"
                className={`story-event__answer ${answer === status ? 'is-selected' : ''}`}
                aria-pressed={answer === status}
                onClick={() => setAnswer(status)}
              >
                {rsvp[status]}
                {answer === status && <Check />}
              </button>
            ))}
          </div>
          <p className="story-event__reply" aria-live="polite">
            {answer ? rsvp.replies[answer] : ' '}
          </p>
          {statuses.map((status) => {
            const guests = GUESTS.filter((guest) => guest.status === status)
            return (
              <div key={status} className="story-event__group">
                <p className="story-event__label">
                  {rsvp[status]} · {guests.length + (answer === status ? 1 : 0)}
                </p>
                <ul>
                  {answer === status && <Chip name={rsvp.you} tone="#ffffff" you />}
                  {guests.map((guest) => (
                    <Chip key={guest.name} name={guest.name} tone={tone(guest.name)} />
                  ))}
                </ul>
              </div>
            )
          })}
        </section>

        <section className="story-event__col">
          <p className="story-event__label">{bring.listTitle}</p>
          <ul className="story-event__bring">
            {bring.items.map((item) => {
              const isMine = mine.has(item.name)
              const by = item.by || (isMine ? bring.you : '')
              return (
                <li key={item.name} className={`${by ? 'is-taken' : ''} ${isMine ? 'is-mine' : ''}`}>
                  <span className="story-event__emoji" aria-hidden>
                    {item.emoji}
                  </span>
                  <span className="story-event__item">
                    <strong>{item.name}</strong>
                    <span>{by ? `${by} ${bring.brings}` : bring.free}</span>
                  </span>
                  {!item.by && (
                    <button
                      type="button"
                      className={`btn btn--small ${isMine ? 'btn--ghost' : 'btn--yes'}`}
                      onClick={() => toggle(item.name)}
                    >
                      {isMine ? bring.unclaim : bring.claim}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
          <p className="story-event__label" aria-live="polite">
            {bring.tally.replace('{n}', String(taken)).replace('{total}', String(bring.items.length))}
          </p>
        </section>
      </div>
    </div>
  )
}
