'use client'

import React, { useTransition } from 'react'

import { setLocale } from '@/app/(frontend)/actions'
import type { Locale } from '@/i18n/dictionaries'

export function LangSwitch({ current }: { current: Locale }) {
  const [pending, startTransition] = useTransition()

  const switchTo = (locale: Locale) => {
    if (locale === current || pending) return
    startTransition(() => setLocale(locale))
  }

  return (
    <div className="lang-switch" role="group" aria-label="Language">
      {(['de', 'en'] as const).map((locale) => (
        <button
          key={locale}
          type="button"
          className={`lang-switch__btn ${current === locale ? 'is-active' : ''}`}
          onClick={() => switchTo(locale)}
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
