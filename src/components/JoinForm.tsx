'use client'

import React, { useState, useTransition } from 'react'

import { joinParty } from '@/app/(frontend)/actions'
import type { Dictionary } from '@/i18n/dictionaries'

export function JoinForm({
  inviteToken,
  dict,
}: {
  inviteToken: string
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
        <button
          type="submit"
          className={`btn btn--big btn--yes ${pending ? 'is-loading' : ''}`}
          disabled={pending}
          aria-busy={pending}
        >
          {dict.cta}
        </button>
      </form>

      {error && <p className="join-form__error">{error}</p>}

      <p className="join-form__hint">{dict.rsvpHint}</p>
    </div>
  )
}
