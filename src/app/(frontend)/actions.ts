'use server'

import config from '@payload-config'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { cookies, headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import type { Where } from 'payload'

import { randomBytes } from 'crypto'

import { canHost, hostedEventIdsFor, isHostOfFor, relId, toIds } from '@/access'
import type { GalleryPhoto } from '@/components/Gallery'
import type { WallPost } from '@/components/Wall'
import { getLocale, LOCALE_COOKIE } from '@/i18n/locale'
import { type Locale, locales } from '@/i18n/dictionaries'
import { isAllowedReaction } from '@/lib/emoji'
import { syntheticGuestEmail } from '@/lib/guestAuth'
import { addEventMember, soleHostedEvents } from '@/lib/membership'
import { MODE_COOKIE } from '@/lib/mode'
import { pushEnabled, sendPush, snippet, type PushMessage } from '@/lib/push'
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

/**
 * Tells an event's people that something happened, after the response has gone
 * out — the guest who posted never waits on a push service. `to` picks the
 * recipients from the event; the actor is always left out.
 */
function notifyEvent(
  payload: PayloadClient,
  eventId: number,
  actorId: number,
  to: 'members' | 'hosts' | number[],
  message: (event: { title: Record<Locale, string>; url: string }) => Omit<PushMessage, 'url'>,
): void {
  if (!pushEnabled) return
  after(async () => {
    const event = await payload.findByID({
      collection: 'events',
      id: eventId,
      depth: 0,
      locale: 'all',
      select: { title: true, slug: true, hosts: true, members: true },
      overrideAccess: true,
    })
    const titles = event.title as unknown as Partial<Record<Locale, string>>
    const title = { de: titles.de ?? titles.en ?? '', en: titles.en ?? titles.de ?? '' }
    const url = event.slug ? `/events/${event.slug}` : '/'
    const recipients = (
      to === 'members' ? toIds(event.members) : to === 'hosts' ? toIds(event.hosts) : to
    ).filter((id) => id !== actorId)
    await sendPush(payload, recipients, { ...message({ title, url }), url })
  })
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

/**
 * Deletes the logged-in account for good.
 *
 * Events only this person runs go first — whole, with everything in them —
 * because the user delete itself refuses to orphan an event (see
 * assertNotSoleHost). Co-hosted events simply lose one host. The account page
 * names the events that will disappear before the button is offered.
 */
export async function deleteAccount(): Promise<{ error: string } | never> {
  const { payload, user } = await getCtx()
  requireUser(user)

  try {
    for (const event of await soleHostedEvents(payload, user.id)) {
      await payload.delete({ collection: 'events', id: event.id, overrideAccess: true })
    }
    await payload.delete({ collection: 'users', id: user.id, overrideAccess: false, user })
  } catch {
    return { error: 'failed' }
  }

  const store = await cookies()
  store.delete('payload-token')
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

/**
 * How many upcoming events one account may run at once. Generous for anybody
 * actually throwing parties, and a ceiling on what a single spam account can
 * cost in storage.
 */
const MAX_UPCOMING_HOSTED = 10

/** Any real account: create an event from the frontend form. */
export async function createEvent(formData: FormData): Promise<{ error: string } | never> {
  const { payload, user } = await getCtx()
  requireUser(user)
  if (!canHost(user)) return { error: 'forbidden' }

  const hostedIds = await hostedEventIdsFor(payload, user)
  if (hostedIds.length >= MAX_UPCOMING_HOSTED) {
    const { totalDocs: upcoming } = await payload.count({
      collection: 'events',
      where: {
        and: [{ id: { in: hostedIds } }, { date: { greater_than: new Date().toISOString() } }],
      },
      overrideAccess: true,
    })
    if (upcoming >= MAX_UPCOMING_HOSTED) return { error: 'limit' }
  }

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
        hosts: [user.id],
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

/** Hosts only: update an event from the edit drawer. No redirect — the
 *  caller refreshes the route so the page updates behind the drawer. */
export async function updateEvent(
  eventId: number,
  formData: FormData,
): Promise<{ error?: string }> {
  const { payload, user } = await getCtx()
  requireUser(user)
  // Editing an event is the event's business, not the account's. Payload
  // enforces it again below via `update: isEventHost('id')`; this only buys a
  // clean error instead of a throw.
  if (!(await isHostOfFor(payload, user, eventId))) return { error: 'forbidden' }

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

/**
 * Hands a guest the keys to this one event, or takes them back.
 *
 * Authorised twice on purpose: explicitly here, so a non-host gets a clean
 * 'forbidden' rather than a throw, and again by Payload through the collection's
 * `update: isEventHost('id')` plus the `hosts` field access.
 */
export async function setEventHost(
  eventId: number,
  userId: number,
  host: boolean,
): Promise<{ error?: string }> {
  const { payload, user } = await getCtx()
  requireUser(user)

  // overrideAccess so a stranger gets 'forbidden' rather than a leaky 404.
  const event = await payload.findByID({
    collection: 'events',
    id: eventId,
    depth: 0,
    overrideAccess: true,
  })

  const hosts = toIds(event.hosts)
  if (!hosts.includes(user.id)) return { error: 'forbidden' }

  const members = toIds(event.members)
  // Rights follow the guest list — you cannot hand an arbitrary account id the
  // keys to a party it was never invited to.
  if (host && !members.includes(userId)) return { error: 'notMember' }
  // Somebody has to be able to open this event tomorrow.
  if (!host && hosts.length <= 1) return { error: 'lastHost' }

  try {
    await payload.update({
      collection: 'events',
      id: eventId,
      data: { hosts: host ? [...new Set([...hosts, userId])] : hosts.filter((id) => id !== userId) },
      overrideAccess: false,
      user,
    })
  } catch {
    return { error: 'failed' }
  }

  revalidatePath('/', 'layout')
  revalidateEventViews()

  // Stepping down means losing read access — a re-render here would land on a
  // notFound(), so leave for a page the user can still see.
  if (!host && userId === user.id) redirect('/events')
  return {}
}

/** Host bugfixing tool: preview the event as a regular invited guest. */
export async function setViewAsGuest(guest: boolean): Promise<void> {
  const { payload, user } = await getCtx()
  requireUser(user)
  // Anyone who runs at least one event may use the preview — including a guest
  // promoted to co-host, who never gets `role: 'admin'`.
  const { docs } = await payload.find({
    collection: 'events',
    where: { hosts: { in: [user.id] } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (docs.length === 0) return
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
  const said = {
    yes: { de: 'ist dabei! 🎉', en: 'is coming! 🎉' },
    maybe: { de: 'kommt vielleicht.', en: 'might come.' },
    no: { de: 'kann leider nicht.', en: 'can’t make it.' },
  }[status]
  notifyEvent(payload, eventId, user.id, 'hosts', ({ title }) => ({
    title,
    body: { de: `${user.name} ${said.de}`, en: `${user.name} ${said.en}` },
    tag: `rsvp-${eventId}-${user.id}`,
  }))
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
  const text = snippet(attachments.content)
  notifyEvent(payload, eventId, user.id, 'members', ({ title }) => ({
    title,
    body: {
      de: `${user.name} an der Pinnwand: ${text || '📷'}`,
      en: `${user.name} on the wall: ${text || '📷'}`,
    },
  }))
  revalidateEventViews()
}

export async function createComment(postId: number, formData: FormData): Promise<void> {
  const { payload, user } = await getCtx()
  requireUser(user)

  const attachments = await extractAttachments(payload, user, formData)
  if (!attachments) return

  const comment = await payload.create({
    collection: 'comments',
    data: { post: postId, author: user.id, ...attachments },
    overrideAccess: false,
    user,
    depth: 1,
  })
  // Replies only reach whoever wrote the post — a ping for every comment in
  // every thread would get notifications switched off by the second party.
  const post = typeof comment.post === 'object' ? comment.post : null
  const postAuthor = relId(post?.author)
  const postEvent = relId(post?.event)
  if (postAuthor && postEvent) {
    const text = snippet(attachments.content)
    notifyEvent(payload, postEvent, user.id, [postAuthor], ({ title }) => ({
      title,
      body: {
        de: `${user.name} hat dir geantwortet: ${text || '📷'}`,
        en: `${user.name} replied to you: ${text || '📷'}`,
      },
    }))
  }
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

  // Undoing somebody else's delete is a host's call. The post has to be read
  // first to know which event that question is about; the update below then
  // re-checks it through the collection's own access rules.
  const post = await payload.findByID({
    collection: 'posts',
    id: postId,
    depth: 0,
    overrideAccess: false,
    user,
  })
  if (!(await isHostOfFor(payload, user, post.event as number))) {
    throw new Error('Only the event’s hosts can restore posts')
  }

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

  const viewerIsHost = await isHostOfFor(payload, user, eventId)
  const isHost = viewerIsHost && !(await getViewAsGuest())

  return fetchWallPosts({ payload, user, eventId, isHost, before })
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

/** Remembers this device for notifications. Idempotent per endpoint. */
export async function savePushSubscription(subscription: {
  endpoint: string
  keys: { p256dh: string; auth: string }
}): Promise<{ error?: string }> {
  const { payload, user } = await getCtx()
  requireUser(user)
  const { endpoint, keys } = subscription ?? {}
  if (!pushEnabled || !endpoint?.startsWith('https://') || !keys?.p256dh || !keys?.auth) {
    return { error: 'invalid' }
  }
  const locale = await getLocale()

  const existing = await payload.find({
    collection: 'push-subscriptions',
    where: { endpoint: { equals: endpoint } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  // A shared tablet changes hands: the endpoint follows whoever is logged in.
  const data = { user: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, locale }
  if (existing.docs[0]) {
    await payload.update({
      collection: 'push-subscriptions',
      id: existing.docs[0].id,
      data,
      overrideAccess: true,
    })
  } else {
    await payload.create({ collection: 'push-subscriptions', data, overrideAccess: true })
  }
  return {}
}

/** Forgets this device. Only the owner's own rows, so a leaked endpoint is harmless. */
export async function removePushSubscription(endpoint: string): Promise<void> {
  const { payload, user } = await getCtx()
  requireUser(user)
  await payload.delete({
    collection: 'push-subscriptions',
    where: { and: [{ endpoint: { equals: endpoint } }, { user: { equals: user.id } }] },
    overrideAccess: true,
  })
}
