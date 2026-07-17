'use client'

import React, { useTransition } from 'react'

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

  const answer = (status: Status) => {
    if (pending || status === myStatus) return
    startTransition(() => rsvp(eventId, status))
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
              aria-pressed={myStatus === status}
              className={`btn btn--big ${className} ${myStatus === status ? 'is-selected' : ''}`}
              onClick={() => answer(status)}
            >
              {label}
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
                      {name}
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
