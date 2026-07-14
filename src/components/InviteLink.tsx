'use client'

import React, { useState } from 'react'

import type { Dictionary } from '@/i18n/dictionaries'

export function InviteLink({ token, dict }: { token: string; dict: Dictionary['invite'] }) {
  const [copied, setCopied] = useState(false)
  const url = typeof window !== 'undefined' ? `${window.location.origin}/join/${token}` : `/join/${token}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable — the input is selectable as fallback
    }
  }

  return (
    <div className="invite-link">
      <h3 className="invite-link__title">{dict.title}</h3>
      <p className="invite-link__hint">{dict.hint}</p>
      <div className="invite-link__row">
        <input
          type="text"
          readOnly
          value={url}
          className="input input--small"
          onFocus={(e) => e.target.select()}
        />
        <button type="button" className="btn btn--small" onClick={copy}>
          {copied ? dict.copied : dict.copy}
        </button>
      </div>
    </div>
  )
}
