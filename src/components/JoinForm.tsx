'use client'

import React, { useState, useTransition } from 'react'

import { joinParty, rejoinParty } from '@/app/(frontend)/actions'
import type { Dictionary } from '@/i18n/dictionaries'
import { Avatar } from './Avatar'

export function JoinForm({
  inviteToken,
  guests,
  dict,
}: {
  inviteToken: string
  guests: { id: number; name: string }[]
  dict: Dictionary['join']
}) {
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const errorText = (code: string) =>
    code === 'name' ? dict.nameMissing : code === 'invalid' ? dict.invalid : dict.failed

  const join = () => {
    if (pending) return
    setError(null)
    startTransition(async () => {
      const result = await joinParty(inviteToken, name)
      if (result?.error) setError(errorText(result.error))
    })
  }

  const rejoin = (userId: number) => {
    if (pending) return
    setError(null)
    startTransition(async () => {
      const result = await rejoinParty(inviteToken, userId)
      if (result?.error) setError(errorText(result.error))
    })
  }

  return (
    <div className="join-form">
      <form
        className="join-form__row"
        onSubmit={(e) => {
          e.preventDefault()
          join()
        }}
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={dict.namePlaceholder}
          maxLength={80}
          required
          autoFocus
          className="input"
          autoComplete="name"
        />
        <button type="submit" className="btn btn--big btn--yes" disabled={pending}>
          {dict.cta}
        </button>
      </form>

      {error && <p className="join-form__error">{error}</p>}

      {guests.length > 0 && (
        <div className="join-form__rejoin">
          <h3>{dict.rejoinTitle}</h3>
          <p>{dict.rejoinHint}</p>
          <ul>
            {guests.map((guest) => (
              <li key={guest.id}>
                <button
                  type="button"
                  className="chip join-form__guest"
                  disabled={pending}
                  onClick={() => rejoin(guest.id)}
                >
                  <Avatar name={guest.name} size={22} />
                  {guest.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
