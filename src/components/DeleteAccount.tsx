'use client'

import React, { useState, useTransition } from 'react'

import { deleteAccount } from '@/app/(frontend)/actions'
import type { Dictionary } from '@/i18n/dictionaries'

/**
 * Two steps instead of a confirm() dialog: the first click only arms the real
 * button, which then says plainly what it does.
 */
export function DeleteAccount({
  soleHosted,
  dict,
}: {
  soleHosted: string[]
  dict: Dictionary['account']
}) {
  const [armed, setArmed] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <section className="account__section">
      <h2 className="account__section-title">{dict.deleteTitle}</h2>
      <p className="account__hint">{dict.deleteHint}</p>
      {soleHosted.length > 0 && (
        <p className="account__hint">
          {dict.deleteEvents} <strong>{soleHosted.map((title) => `„${title}“`).join(', ')}</strong>
        </p>
      )}

      {error && <p className="auth-form__error">{error}</p>}

      {armed ? (
        <div className="account__danger-actions">
          <button
            type="button"
            className="btn btn--yes"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                setError(null)
                const result = await deleteAccount()
                if (result?.error) setError(dict.deleteFailed)
              })
            }
          >
            {dict.deleteConfirm}
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setArmed(false)}>
            {dict.deleteCancel}
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn--ghost" onClick={() => setArmed(true)}>
          {dict.deleteButton}
        </button>
      )}
    </section>
  )
}
