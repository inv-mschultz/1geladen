'use server'

import config from '@payload-config'
import { revalidatePath } from 'next/cache'
import { cookies, headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import { randomBytes } from 'crypto'

import { getLocale, LOCALE_COOKIE } from '@/i18n/locale'
import { type Locale, locales } from '@/i18n/dictionaries'
import { syntheticGuestEmail } from '@/lib/guestAuth'
import { addEventMember } from '@/lib/membership'

async function getCtx() {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  return { payload, user }
}

function requireUser<T>(user: T | null): asserts user is T {
  if (!user) throw new Error('Not logged in')
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
  await addEventMember(payload, event, guest.id)

  const login = await payload.login({ collection: 'users', data: { email, password } })
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
  if (!title || !dateIso || Number.isNaN(Date.parse(dateIso))) return { error: 'invalid' }

  const locationName = String(formData.get('locationName') ?? '').trim()
  const address = String(formData.get('address') ?? '').trim()
  const mapsUrl = String(formData.get('mapsUrl') ?? '').trim()
  const description = String(formData.get('description') ?? '')
  const themeColor = String(formData.get('themeColor') ?? '').trim()
  const accentColor = String(formData.get('accentColor') ?? '').trim()

  let event
  try {
    event = await payload.create({
      collection: 'events',
      data: {
        title,
        date: dateIso,
        location: {
          name: locationName || undefined,
          address: address || undefined,
          mapsUrl: mapsUrl || undefined,
        },
        description: textToRichText(description),
        themeColor: /^#[0-9a-fA-F]{6}$/.test(themeColor) ? themeColor : undefined,
        accentColor: /^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : undefined,
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
  if (!title || !dateIso || Number.isNaN(Date.parse(dateIso))) return { error: 'invalid' }

  const themeColor = String(formData.get('themeColor') ?? '').trim()
  const accentColor = String(formData.get('accentColor') ?? '').trim()
  const locale = await getLocale()

  try {
    await payload.update({
      collection: 'events',
      id: eventId,
      locale,
      data: {
        title,
        date: dateIso,
        location: {
          name: String(formData.get('locationName') ?? '').trim() || undefined,
          address: String(formData.get('address') ?? '').trim() || undefined,
          mapsUrl: String(formData.get('mapsUrl') ?? '').trim() || undefined,
        },
        description: textToRichText(String(formData.get('description') ?? '')),
        themeColor: /^#[0-9a-fA-F]{6}$/.test(themeColor) ? themeColor : undefined,
        accentColor: /^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : undefined,
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
  revalidatePath('/', 'layout')
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
  revalidatePath('/', 'layout')
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
  revalidatePath('/', 'layout')
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
  revalidatePath('/', 'layout')
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
  revalidatePath('/', 'layout')
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
  revalidatePath('/', 'layout')
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
  revalidatePath('/', 'layout')
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
  revalidatePath('/', 'layout')
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
  revalidatePath('/', 'layout')
}
