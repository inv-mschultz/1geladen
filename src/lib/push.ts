import type { Payload } from 'payload'
import webpush from 'web-push'

import type { Locale } from '@/i18n/dictionaries'

/** What a notification says, in both languages — the recipient's device picks. */
export type PushMessage = {
  title: Record<Locale, string>
  body: Record<Locale, string>
  /** Where tapping the notification lands. Same-origin path. */
  url: string
  /** Notifications with the same tag replace each other instead of piling up. */
  tag?: string
}

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const privateKey = process.env.VAPID_PRIVATE_KEY

/**
 * Push is optional: without VAPID keys the toggle stays hidden and every send
 * is a no-op, so local dev and preview deployments need no setup. Generate a
 * pair once with `npx web-push generate-vapid-keys`.
 */
export const pushEnabled = Boolean(publicKey && privateKey)

/**
 * web-push wants the subject as a URL. A bare address ("hey@example.com") is
 * the natural thing to type into Vercel, so it gets its mailto: here rather
 * than failing the build.
 */
const vapidSubject = (): string => {
  const raw = (process.env.VAPID_SUBJECT || 'hallo@1geladen.de').trim()
  return /^(mailto:|https:)/.test(raw) ? raw : `mailto:${raw}`
}

/**
 * Configured on first send, not at import: this module is imported by pages,
 * and a throw at module load takes the whole page — and the build — with it.
 */
let configured: boolean | null = null
const configure = (logger: Payload['logger']): boolean => {
  if (configured !== null) return configured
  try {
    webpush.setVapidDetails(vapidSubject(), publicKey as string, privateKey as string)
    configured = true
  } catch (err) {
    logger.error({ err, msg: 'VAPID settings are invalid; push is off' })
    configured = false
  }
  return configured
}

/**
 * Notifies every device of the given users. Never throws — a notification is a
 * nicety, and the action that triggered it has already succeeded.
 *
 * Subscriptions the push service reports as gone (404/410: app uninstalled,
 * permission revoked) are deleted on the spot, so the table cleans itself.
 */
export async function sendPush(
  payload: Payload,
  userIds: number[],
  message: PushMessage,
): Promise<void> {
  if (!pushEnabled || userIds.length === 0 || !configure(payload.logger)) return

  try {
    const { docs } = await payload.find({
      collection: 'push-subscriptions',
      where: { user: { in: userIds } },
      limit: 1000,
      depth: 0,
      overrideAccess: true,
    })

    await Promise.all(
      docs.map(async (sub) => {
        const locale: Locale = sub.locale === 'en' ? 'en' : 'de'
        const body = JSON.stringify({
          title: message.title[locale],
          body: message.body[locale],
          url: message.url,
          tag: message.tag,
        })
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            body,
            { TTL: 60 * 60 * 24 },
          )
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode
          if (status === 404 || status === 410) {
            await payload.delete({
              collection: 'push-subscriptions',
              id: sub.id,
              overrideAccess: true,
            })
          } else {
            payload.logger.warn({ err, msg: 'push send failed' })
          }
        }
      }),
    )
  } catch (err) {
    payload.logger.warn({ err, msg: 'push fan-out failed' })
  }
}

/** Shortens free text for a notification body. */
export const snippet = (text: string | null | undefined, max = 90): string => {
  const flat = (text ?? '').replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max).trimEnd()}…` : flat
}
