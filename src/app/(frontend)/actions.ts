'use server'

import config from '@payload-config'
import { revalidatePath } from 'next/cache'
import { cookies, headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'

import { LOCALE_COOKIE } from '@/i18n/locale'
import { type Locale, locales } from '@/i18n/dictionaries'

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
