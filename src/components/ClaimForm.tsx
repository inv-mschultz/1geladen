'use client'

import React, { useState, useTransition } from 'react'

import { claimAccount } from '@/app/(frontend)/actions'
import type { Dictionary } from '@/i18n/dictionaries'

export function ClaimForm({
  currentEmail,
  isSynthetic,
  dict,
}: {
  currentEmail: string
  isSynthetic: boolean
  dict: Dictionary['account']
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      className="auth-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (pending) return
        setError(null)
        const formData = new FormData(e.currentTarget)
        startTransition(async () => {
          const result = await claimAccount(formData)
          if (result?.error) setError(dict.error)
        })
      }}
    >
      {isSynthetic && <p className="account__hint">{dict.syntheticHint}</p>}
      <label className="field">
        <span>{dict.email}</span>
        <input
          name="email"
          type="email"
          required
          defaultValue={isSynthetic ? '' : currentEmail}
          className="input"
          autoComplete="email"
        />
      </label>
      <label className="field">
        <span>{dict.password}</span>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          className="input"
          autoComplete="new-password"
        />
      </label>

      {error && <p className="auth-form__error">{error}</p>}

      <button type="submit" className="btn btn--big btn--yes auth-form__submit" disabled={pending}>
        {dict.save}
      </button>
    </form>
  )
}
