'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { setEventHost } from '@/app/(frontend)/actions'
import type { Dictionary } from '@/i18n/dictionaries'
import { Avatar } from './Avatar'

export type HostListPerson = {
  id: number
  name: string
  isHost: boolean
  /** Created the event. Can't be stood down — their RSVP is pinned to yes. */
  isCreator: boolean
  isMe: boolean
}

export function HostList({
  eventId,
  people,
  dict,
}: {
  eventId: number
  people: HostListPerson[]
  dict: Dictionary['hosts']
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  // `pending` is shared by every row, so remember which one was clicked.
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const hostCount = people.filter((person) => person.isHost).length

  const toggle = (person: HostListPerson) => {
    setBusy(person.id)
    setError(null)
    startTransition(async () => {
      const result = await setEventHost(eventId, person.id, !person.isHost)
      setBusy(null)
      if (result?.error) {
        setError(result.error === 'lastHost' ? dict.lastHost : dict.failed)
        return
      }
      // The access lookup is cached per request, so re-rendering in this one
      // would still see the old host list. Ask for a fresh request instead.
      router.refresh()
    })
  }

  if (people.length === 0) return <p className="section__empty">{dict.empty}</p>

  return (
    <div className="hostlist">
      <p className="hostlist__hint">{dict.hint}</p>
      <ul className="hostlist__list">
        {people.map((person) => {
          // The creator stays. Beyond that, only the last host is protected —
          // the server enforces both again.
          const locked = person.isCreator || (person.isHost && hostCount <= 1)
          return (
            <li key={person.id} className="hostlist__row">
              <span className="hostlist__who">
                <Avatar name={person.name} size={26} host={person.isHost} />
                <span className="hostlist__name">
                  {person.name}
                  {person.isMe && <span className="hostlist__you"> ({dict.you})</span>}
                </span>
                {person.isHost && (
                  <span className="chip chip--host" title={person.isCreator ? dict.creator : undefined}>
                    {dict.badge}
                  </span>
                )}
              </span>
              {!locked && (
                <button
                  type="button"
                  className={`btn btn--small ${busy === person.id ? 'is-loading' : ''}`}
                  disabled={pending}
                  aria-busy={busy === person.id}
                  onClick={() => toggle(person)}
                >
                  <span className="btn__label">
                    {person.isHost ? dict.demote : dict.promote}
                  </span>
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {error && <p className="hostlist__error">{error}</p>}
    </div>
  )
}
