'use server'

import config from '@payload-config'
import { revalidatePath } from 'next/cache'
import { cookies, headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import type { Where } from 'payload'

import { randomBytes } from 'crypto'

import type { GalleryPhoto } from '@/components/Gallery'
import type { WallPost } from '@/components/Wall'
import { getLocale, LOCALE_COOKIE } from '@/i18n/locale'
import { type Locale, locales } from '@/i18n/dictionaries'
import { isAllowedReaction } from '@/lib/emoji'
import { syntheticGuestEmail } from '@/lib/guestAuth'
import { addEventMember } from '@/lib/membership'
import { MODE_COOKIE } from '@/lib/mode'
import { PLATFORM_ACCENT, PLATFORM_COLOR } from '@/lib/theme'
import { getViewAsGuest } from '@/lib/viewas'
import { fetchGalleryPhotos } from '@/lib/gallery'
import { fetchWallPosts } from '@/lib/wall'

/** Events must be in the future — and never in a pre-2026 year (typo guard). */
const isValidEventDate = (dateIso: string): boolean => {
  const date = new Date(dateIso)
  if (Number.isNaN(date.getTime()) || date.getFullYear() < 2026) return false
  return date.getTime() > Date.now()
}

const HEX = /^#[0-9a-fA-F]{6}$/

const locationFromForm = (formData: FormData) => ({
  name: String(formData.get('locationName') ?? '').trim() || undefined,
  street: String(formData.get('street') ?? '').trim() || undefined,
  zip: String(formData.get('zip') ?? '').trim() || undefined,
  city: String(formData.get('city') ?? '').trim() || undefined,
})

async function getCtx() {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  return { payload, user }
}

function requireUser<T>(user: T | null): asserts user is T {
  if (!user) throw new Error('Not logged in')
}

/**
 * Event content changed (RSVP, wall, bring list, photos). Page scope only:
 * the layout — header, nav, auth lookup — is unaffected by these, so
 * revalidating it too would just add another auth round trip per action.
 * The route pattern covers whichever event page the user is on; '/' covers
 * the home view, which renders the featured event.
 */
function revalidateEventViews(): void {
  revalidatePath('/events/[slug]', 'page')
  revalidatePath('/', 'page')
}

export async function setLocale(locale: string): Promise<void> {
  if (!locales.includes(locale as Locale)) return
  const store = await cookies()
  store.set(LOCALE_COOKIE, locale, { path: '/', maxAge: 60 * 60 * 24 * 365 })
  revalidatePath('/', 'layout')
}

async function setSessionCookie(token: string, exp?: number | null): Promise<void> {
  const store = await cookies()
  store.set('payload-token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    ...(exp ? { expires: new Date(exp * 1000) } : {}),
  })
}

async function findEventByInviteToken(payload: PayloadClient, inviteToken: string) {
  if (!inviteToken) return null
  const { docs } = await payload.find({
    collection: 'events',
    where: { inviteToken: { equals: inviteToken } },
    limit: 1,
    overrideAccess: true,
  })
  return docs[0] ?? null
}

/** Invite-link join: one name, zero friction. Creates a real guest account. */
export async function joinParty(inviteToken: string, name: string): Promise<{ error: string } | never> {
  const payload = await getPayload({ config })

  const trimmed = name.trim()
  if (!trimmed) return { error: 'name' }

  const event = await findEventByInviteToken(payload, inviteToken)
  if (!event) return { error: 'invalid' }

  const email = syntheticGuestEmail()
  const password = randomBytes(24).toString('hex')

  const guest = await payload.create({
    collection: 'users',
    data: { name: trimmed.slice(0, 80), email, password, role: 'guest', guestJoin: true },
    overrideAccess: true,
  })

  // Independent of each other — run concurrently so the guest waits for one
  // round trip instead of two (matters on serverless + remote Postgres).
  const [, login] = await Promise.all([
    addEventMember(payload, event, guest.id),
    payload.login({ collection: 'users', data: { email, password } }),
  ])
  if (!login.token) return { error: 'failed' }
  await setSessionCookie(login.token, login.exp)

  revalidatePath('/', 'layout')
  redirect(event.slug ? `/events/${event.slug}` : '/')
}

/** Upgrade an invite-link guest to a real account (email + password). */
export async function claimAccount(formData: FormData): Promise<{ error: string } | never> {
  const { payload, user } = await getCtx()
  requireUser(user)

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  if (!email || password.length < 6) return { error: 'invalid' }

  try {
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { email, password, guestJoin: false },
      overrideAccess: true,
    })
  } catch {
    return { error: 'taken' }
  }

  const login = await payload.login({ collection: 'users', data: { email, password } })
  if (login.token) await setSessionCookie(login.token, login.exp)

  revalidatePath('/', 'layout')
  redirect('/')
}

/** Plain textarea → lexical rich text (one paragraph per line). */
function textToRichText(text: string) {
  const paragraphs = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  if (paragraphs.length === 0) return undefined
  return {
    root: {
      type: 'root' as const,
      format: '' as const,
      indent: 0,
      version: 1,
      direction: 'ltr' as const,
      children: paragraphs.map((line) => ({
        type: 'paragraph',
        format: '' as const,
        indent: 0,
        version: 1,
        direction: 'ltr' as const,
        children: [{ type: 'text', text: line, version: 1 }],
      })),
    },
  }
}

/** Admin-only: create an event from the frontend form. */
export async function createEvent(formData: FormData): Promise<{ error: string } | never> {
  const { payload, user } = await getCtx()
  requireUser(user)
  if (user.role !== 'admin') return { error: 'forbidden' }

  const title = String(formData.get('title') ?? '').trim()
  const dateIso = String(formData.get('dateIso') ?? '')
  if (!title || !isValidEventDate(dateIso)) return { error: 'invalid' }

  let event
  try {
    // New events always start with the locked-in standard colors — the host
    // tweaks them later in the edit drawer, where the live preview exists.
    event = await payload.create({
      collection: 'events',
      data: {
        title,
        date: dateIso,
        location: locationFromForm(formData),
        description: textToRichText(String(formData.get('description') ?? '')),
        themeColor: PLATFORM_COLOR,
        accentColor: PLATFORM_ACCENT,
        members: [user.id],
      },
      overrideAccess: false,
      user,
    })
  } catch {
    return { error: 'invalid' }
  }

  revalidatePath('/', 'layout')
  redirect(event.slug ? `/events/${event.slug}` : '/events')
}

/** Admin-only: update an event from the edit drawer. No redirect — the
 *  caller refreshes the route so the page updates behind the drawer. */
export async function updateEvent(
  eventId: number,
  formData: FormData,
): Promise<{ error?: string }> {
  const { payload, user } = await getCtx()
  requireUser(user)
  if (user.role !== 'admin') return { error: 'forbidden' }

  const title = String(formData.get('title') ?? '').trim()
  const dateIso = String(formData.get('dateIso') ?? '')
  if (!title || !isValidEventDate(dateIso)) return { error: 'invalid' }

  const themeColor = String(formData.get('themeColor') ?? '').trim()
  const accentColor = String(formData.get('accentColor') ?? '').trim()
  const accentColorLight = String(formData.get('accentColorLight') ?? '').trim()
  const locale = await getLocale()

  try {
    await payload.update({
      collection: 'events',
      id: eventId,
      locale,
      data: {
        title,
        date: dateIso,
        location: locationFromForm(formData),
        description: textToRichText(String(formData.get('description') ?? '')),
        themeColor: HEX.test(themeColor) ? themeColor : undefined,
        accentColor: HEX.test(accentColor) ? accentColor : undefined,
        accentColorLight: HEX.test(accentColorLight) ? accentColorLight : undefined,
      },
      overrideAccess: false,
      user,
    })
  } catch {
    return { error: 'invalid' }
  }

  revalidatePath('/', 'layout')
  return {}
}

/** Admin bugfixing tool: preview the event as a regular invited guest. */
export async function setViewAsGuest(guest: boolean): Promise<void> {
  const { user } = await getCtx()
  requireUser(user)
  if (user.role !== 'admin') return
  const store = await cookies()
  if (guest) {
    store.set('1geladen-viewas', 'guest', { path: '/', maxAge: 60 * 60 * 24 })
  } else {
    store.delete('1geladen-viewas')
  }
  revalidatePath('/', 'layout')
}

/** Everyone picks their own polarity: dark on light, or light on dark. */
export async function setThemeMode(mode: 'dark' | 'light'): Promise<void> {
  if (mode !== 'dark' && mode !== 'light') return
  const store = await cookies()
  store.set(MODE_COOKIE, mode, { path: '/', maxAge: 60 * 60 * 24 * 365 })
  revalidatePath('/', 'layout')
}

export async function logout(): Promise<void> {
  const store = await cookies()
  store.delete('payload-token')
  revalidatePath('/', 'layout')
}

export async function rsvp(eventId: number, status: 'yes' | 'maybe' | 'no'): Promise<void> {
  const { payload, user } = await getCtx()
  requireUser(user)

  const existing = await payload.find({
    collection: 'rsvps',
    where: { and: [{ user: { equals: user.id } }, { event: { equals: eventId } }] },
    limit: 1,
    overrideAccess: false,
    user,
  })

  if (existing.docs[0]) {
    await payload.update({
      collection: 'rsvps',
      id: existing.docs[0].id,
      data: { status },
      overrideAccess: false,
      user,
    })
  } else {
    await payload.create({
      collection: 'rsvps',
      data: { event: eventId, user: user.id, status },
      overrideAccess: false,
      user,
    })
  }
  revalidateEventViews()
}

type PayloadClient = Awaited<ReturnType<typeof getPayload>>
type SessionUser = NonNullable<Awaited<ReturnType<PayloadClient['auth']>>['user']>

/** Extracts text/GIF/image from a composer FormData; uploads the image if present. */
async function extractAttachments(
  payload: PayloadClient,
  user: SessionUser,
  formData: FormData,
): Promise<{ content?: string; gifUrl?: string; image?: number } | null> {
  const content = String(formData.get('content') ?? '').trim()
  const gifUrl = String(formData.get('gifUrl') ?? '').trim()
  const photo = formData.get('photo')

  let image: number | undefined
  if (photo instanceof File && photo.size > 0 && photo.type.startsWith('image/')) {
    const media = await payload.create({
      collection: 'media',
      file: {
        data: Buffer.from(await photo.arrayBuffer()),
        name: photo.name,
        mimetype: photo.type,
        size: photo.size,
      },
      data: { alt: photo.name, uploadedBy: user.id },
      overrideAccess: false,
      user,
    })
    image = media.id
  }

  if (!content && !gifUrl && !image) return null
  return {
    content: content || undefined,
    gifUrl: gifUrl || undefined,
    image,
  }
}

export async function createPost(eventId: number, formData: FormData): Promise<void> {
  const { payload, user } = await getCtx()
  requireUser(user)

  const attachments = await extractAttachments(payload, user, formData)
  if (!attachments) return

  await payload.create({
    collection: 'posts',
    data: { event: eventId, author: user.id, ...attachments },
    overrideAccess: false,
    user,
  })
  revalidateEventViews()
}

export async function createComment(postId: number, formData: FormData): Promise<void> {
  const { payload, user } = await getCtx()
  requireUser(user)

  const attachments = await extractAttachments(payload, user, formData)
  if (!attachments) return

  await payload.create({
    collection: 'comments',
    data: { post: postId, author: user.id, ...attachments },
    overrideAccess: false,
    user,
  })
  revalidateEventViews()
}

/**
 * Guests can remove their own comments; admins can remove any. Enforcement is
 * Payload's — `overrideAccess: false` applies the collection's
 * `delete: isAdminOrOwner('author')`, so a forged id fails server-side.
 * Comments are removed outright (no soft-delete field, unlike posts).
 */
export async function deleteComment(commentId: number): Promise<void> {
  const { payload, user } = await getCtx()
  requireUser(user)

  await payload.delete({
    collection: 'comments',
    id: commentId,
    overrideAccess: false,
    user,
  })
  revalidateEventViews()
}

export async function deletePost(postId: number): Promise<void> {
  const { payload, user } = await getCtx()
  requireUser(user)

  await payload.update({
    collection: 'posts',
    id: postId,
    data: { deleted: true },
    overrideAccess: false,
    user,
  })
  revalidateEventViews()
}

export async function restorePost(postId: number): Promise<void> {
  const { payload, user } = await getCtx()
  requireUser(user)
  if (user.role !== 'admin') throw new Error('Only admins can restore posts')

  await payload.update({
    collection: 'posts',
    id: postId,
    data: { deleted: false },
    overrideAccess: false,
    user,
  })
  revalidateEventViews()
}

/**
 * Adds the viewer's reaction, or removes it if it's already there — the UI only
 * ever offers a toggle, so both directions live in one action.
 *
 * The collection's own hooks handle event membership and pin the row to the
 * logged-in guest, so this stays a thin wrapper with access checks left on.
 */
export async function toggleReaction(
  target: { kind: 'post' | 'comment'; id: number },
  emoji: string,
): Promise<void> {
  const { payload, user } = await getCtx()
  requireUser(user)
  if (!isAllowedReaction(emoji)) throw new Error('Unknown reaction')

  const targetFilter: Where =
    target.kind === 'post' ? { post: { equals: target.id } } : { comment: { equals: target.id } }

  const existing = await payload.find({
    collection: 'reactions',
    where: { and: [{ user: { equals: user.id } }, { emoji: { equals: emoji } }, targetFilter] },
    limit: 1,
    depth: 0,
    overrideAccess: false,
    user,
  })

  if (existing.docs[0]) {
    await payload.delete({
      collection: 'reactions',
      id: existing.docs[0].id,
      overrideAccess: false,
      user,
    })
  } else {
    await payload.create({
      collection: 'reactions',
      data: {
        emoji,
        user: user.id,
        ...(target.kind === 'post' ? { post: target.id } : { comment: target.id }),
      },
      overrideAccess: false,
      user,
    })
  }
  revalidateEventViews()
}

export async function addBringItem(eventId: number, title: string, note?: string): Promise<void> {
  const { payload, user } = await getCtx()
  requireUser(user)
  const trimmed = title.trim()
  if (!trimmed) return

  await payload.create({
    collection: 'bring-items',
    data: {
      event: eventId,
      title: trimmed,
      note: note?.trim() || undefined,
      createdBy: user.id,
    },
    overrideAccess: false,
    user,
  })
  revalidateEventViews()
}

export async function deleteBringItem(itemId: number): Promise<void> {
  const { payload, user } = await getCtx()
  requireUser(user)

  await payload.delete({
    collection: 'bring-items',
    id: itemId,
    overrideAccess: false,
    user,
  })
  revalidateEventViews()
}

export async function claimBringItem(itemId: number, claim: boolean): Promise<void> {
  const { payload, user } = await getCtx()
  requireUser(user)

  await payload.update({
    collection: 'bring-items',
    id: itemId,
    data: { claimedBy: claim ? user.id : null },
    overrideAccess: false,
    user,
  })
  revalidateEventViews()
}

export async function uploadPhotos(eventId: number, formData: FormData): Promise<void> {
  const { payload, user } = await getCtx()
  requireUser(user)

  const files = formData.getAll('photos').filter((f): f is File => f instanceof File)
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue
    const data = Buffer.from(await file.arrayBuffer())
    await payload.create({
      collection: 'media',
      file: {
        data,
        name: file.name,
        mimetype: file.type,
        size: file.size,
      },
      data: {
        event: eventId,
        alt: file.name,
        uploadedBy: user.id,
      },
      overrideAccess: false,
      user,
    })
  }
  revalidateEventViews()
}

/**
 * Pulls the next page of older wall posts. Keeps the initial page load (and
 * every action's re-render) to one window of posts instead of the full history.
 */
export async function loadOlderPosts(
  eventId: number,
  before: string,
): Promise<{ posts: WallPost[]; hasMore: boolean }> {
  const { payload, user } = await getCtx()
  requireUser(user)

  const isRealAdmin = user.role === 'admin'
  const isAdmin = isRealAdmin && !(await getViewAsGuest())

  return fetchWallPosts({ payload, user, eventId, isAdmin, before })
}

/** Pulls the next page of older gallery photos (same reasoning as the wall). */
export async function loadOlderPhotos(
  eventId: number,
  before: string,
  coverImageId?: number | null,
): Promise<{ photos: GalleryPhoto[]; hasMore: boolean }> {
  const { payload, user } = await getCtx()
  requireUser(user)

  return fetchGalleryPhotos({ payload, user, eventId, coverImageId, before })
}
