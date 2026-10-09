'use client'

import React, { useEffect, useState, useTransition } from 'react'

import { removePushSubscription, savePushSubscription } from '@/app/(frontend)/actions'
import type { Dictionary } from '@/i18n/dictionaries'
import { isIos, isStandalone } from '@/lib/pwa'
import { useMounted } from '@/lib/useMounted'

type State = 'loading' | 'unsupported' | 'install-first' | 'denied' | 'off' | 'on'

/** VAPID public key (base64url) → the bytes pushManager.subscribe wants. */
const keyBytes = (base64url: string): Uint8Array<ArrayBuffer> => {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

/**
 * Notifications for this device: RSVPs to your events, new wall posts, replies
 * to you. Per device on purpose — the phone wants them, the work laptop doesn't.
 */
export function PushToggle({ publicKey, dict }: { publicKey: string; dict: Dictionary['push'] }) {
  const mounted = useMounted()
  const [subscribed, setSubscribed] = useState<boolean | null>(null)
  const [denied, setDenied] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState(false)

  const supported =
    mounted && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

  useEffect(() => {
    if (!supported) return
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(Boolean(sub)))
      .catch(() => setSubscribed(false))
  }, [supported])

  const state: State = !mounted
    ? 'loading'
    : !supported
      ? // iOS only exposes push to apps added to the home screen.
        isIos() && !isStandalone()
        ? 'install-first'
        : 'unsupported'
      : denied || Notification.permission === 'denied'
        ? 'denied'
        : subscribed === null
          ? 'loading'
          : subscribed
            ? 'on'
            : 'off'

  const turnOn = () =>
    startTransition(async () => {
      setError(false)
      try {
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setDenied(permission === 'denied')
          return
        }
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBytes(publicKey),
        })
        const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
        const result = await savePushSubscription(json)
        if (result.error) throw new Error(result.error)
        setSubscribed(true)
      } catch {
        setError(true)
      }
    })

  const turnOff = () =>
    startTransition(async () => {
      setError(false)
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await removePushSubscription(sub.endpoint)
          await sub.unsubscribe()
        }
        setSubscribed(false)
      } catch {
        setError(true)
      }
    })

  return (
    <section className="account__section">
      <h2 className="account__section-title">{dict.title}</h2>
      <p className="account__hint">{dict.hint}</p>
      {state === 'install-first' && <p className="account__hint">{dict.installFirst}</p>}
      {state === 'unsupported' && <p className="account__hint">{dict.unsupported}</p>}
      {state === 'denied' && <p className="account__hint">{dict.denied}</p>}
      {error && <p className="auth-form__error">{dict.failed}</p>}
      {state === 'off' && (
        <button type="button" className="btn btn--yes" disabled={pending} onClick={turnOn}>
          {dict.turnOn}
        </button>
      )}
      {state === 'on' && (
        <button type="button" className="btn btn--ghost" disabled={pending} onClick={turnOff}>
          {dict.turnOff}
        </button>
      )}
    </section>
  )
}
