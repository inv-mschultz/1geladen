'use client'

import React, { useOptimistic, useTransition } from 'react'

import { rsvp } from '@/app/(frontend)/actions'
import type { Dictionary } from '@/i18n/dictionaries'
import { Avatar } from './Avatar'

type Status = 'yes' | 'maybe' | 'no'

export type RsvpEntry = { name: string; isHost?: boolean }

export function Rsvp({
  eventId,
  myStatus,
  entries,
  canRespond,
  dict,
}: {
  eventId: number
  myStatus: Status | null
  entries: Record<Status, RsvpEntry[]>
  canRespond: boolean
  dict: Dictionary['rsvp']
}) {
  const [pending, startTransition] = useTransition()
  // The answer shows immediately and is replaced by the server's version when
  // revalidation lands — the round trip is several queries deep, and waiting on
  // it made a tap feel broken.
  const [shownStatus, showStatus] = useOptimistic(myStatus)
  // Which button is in flight — so only that one spins, not all three.
  const [sending, showSending] = useOptimistic<Status | null, Status | null>(
    null,
    (_, next) => next,
  )

  const answer = (status: Status) => {
    if (pending || status === shownStatus) return
    startTransition(async () => {
      showStatus(status)
      showSending(status)
      await rsvp(eventId, status)
    })
  }

  const buttons: { status: Status; label: string; className: string }[] = [
    { status: 'yes', label: dict.yes, className: 'btn--yes' },
    { status: 'maybe', label: dict.maybe, className: 'btn--maybe' },
    { status: 'no', label: dict.no, className: 'btn--no' },
  ]

  const groups: { status: Status; label: string }[] = [
    { status: 'yes', label: dict.attending },
    { status: 'maybe', label: dict.maybes },
    { status: 'no', label: dict.declined },
  ]

  const total = entries.yes.length + entries.maybe.length + entries.no.length

  return (
    <div className="rsvp">
      {canRespond && (
        <div className="rsvp__buttons">
          {buttons.map(({ status, label, className }) => (
            <button
              key={status}
              type="button"
              disabled={pending}
              aria-busy={sending === status}
              aria-pressed={shownStatus === status}
              className={`btn btn--big ${className} ${shownStatus === status ? 'is-selected' : ''} ${
                sending === status ? 'is-loading' : ''
              }`}
              onClick={() => answer(status)}
            >
              <span className="btn__label">{label}</span>
            </button>
          ))}
        </div>
      )}

      {total === 0 ? (
        <p className="rsvp__empty">{dict.nobodyYet}</p>
      ) : (
        <div className="rsvp__groups">
          {groups.map(({ status, label }) =>
            entries[status].length === 0 ? null : (
              <div key={status} className={`rsvp__group rsvp__group--${status}`}>
                <h4>{label}</h4>
                <ul>
                  {entries[status].map(({ name, isHost }) => (
                    <li key={name} className="chip">
                      <Avatar name={name} size={22} host={isHost} />
                      <span className="chip__name">{name}</span>
                      {isHost && <span className="chip__tag">{dict.host}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  )
}
