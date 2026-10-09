'use client'

import React, { useEffect, useState } from 'react'

import type { Dictionary } from '@/i18n/dictionaries'
import { isIos, isStandalone, storage } from '@/lib/pwa'
import { useMounted } from '@/lib/useMounted'
import { X } from './icons'

const DISMISSED_KEY = '1geladen-install-dismissed'

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> }

/**
 * "Put 1geladen on your home screen." Android/Chrome hand us a real install
 * prompt; iOS Safari has none, so it gets the two taps spelled out. Nothing
 * shows once installed, once dismissed, or on desktop browsers that can't
 * install.
 */
export function InstallHint({ dict }: { dict: Dictionary['install'] }) {
  const mounted = useMounted()
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPrompt(e as InstallPrompt)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  // Everything below reads the browser, so it waits for the client.
  if (!mounted || dismissed || isStandalone() || storage.get(DISMISSED_KEY)) return null
  const ios = isIos()
  if (!prompt && !ios) return null

  const dismiss = () => {
    storage.set(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  return (
    <aside className="install-hint" aria-label={dict.title}>
      {/* A fixed 40px PNG from /public — nothing for next/image to optimise. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" className="install-hint__icon" width={40} height={40} />
      <div className="install-hint__text">
        <strong>{dict.title}</strong>
        <span>{ios && !prompt ? dict.ios : dict.android}</span>
      </div>
      {prompt && (
        <button
          type="button"
          className="btn btn--small btn--yes"
          onClick={async () => {
            await prompt.prompt()
            await prompt.userChoice
            setPrompt(null)
            setDismissed(true)
          }}
        >
          {dict.install}
        </button>
      )}
      <button type="button" className="btn--icon install-hint__close" aria-label={dict.dismiss} onClick={dismiss}>
        <X />
      </button>
    </aside>
  )
}
