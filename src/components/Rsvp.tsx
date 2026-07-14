'use client'

import React, { useTransition } from 'react'

import { rsvp } from '@/app/(frontend)/actions'
import type { Dictionary } from '@/i18n/dictionaries'
import { Avatar } from './Avatar'

type Status = 'yes' | 'maybe' | 'no'

export function Rsvp({
  eventId,
  myStatus,
  names,
  dict,
}: {
  eventId: number
  myStatus: Status | null
  names: Record<Status, string[]>
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

  const total = names.yes.length + names.maybe.length + names.no.length

  return (
    <div className="rsvp">
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

      {total === 0 ? (
        <p className="rsvp__empty">{dict.nobodyYet}</p>
      ) : (
        <div className="rsvp__groups">
          {groups.map(({ status, label }) =>
            names[status].length === 0 ? null : (
              <div key={status} className={`rsvp__group rsvp__group--${status}`}>
                <h4>
                  {label} <span className="rsvp__count">{names[status].length}</span>
                </h4>
                <ul>
                  {names[status].map((name) => (
                    <li key={name} className="chip">
                      <Avatar name={name} size={22} />
                      {name}
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
