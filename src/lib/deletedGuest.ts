import { randomBytes } from 'crypto'

import type { PayloadRequest } from 'payload'

/**
 * Sentinel account that inherits the posts and comments of deleted guests, so
 * threads keep their shape instead of losing replies. Never logged into: the
 * password is random and thrown away.
 */
export const DELETED_GUEST_EMAIL = 'deleted-guest@partey.invalid'

/** Finds the placeholder account, creating it on first use. */
export async function getDeletedGuestId(req: PayloadRequest): Promise<number> {
  const existing = await req.payload.find({
    collection: 'users',
    where: { email: { equals: DELETED_GUEST_EMAIL } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  if (existing.docs[0]) return existing.docs[0].id

  const created = await req.payload.create({
    collection: 'users',
    data: {
      name: 'Deleted guest',
      email: DELETED_GUEST_EMAIL,
      password: randomBytes(32).toString('hex'),
      role: 'guest',
    },
    overrideAccess: true,
    req,
  })
  return created.id
}

/**
 * Clears the rows that would otherwise block deleting a user.
 *
 * `posts.author`, `comments.author` and `rsvps.user` are NOT NULL columns whose
 * foreign key is ON DELETE SET NULL — the two contradict, so Postgres aborts the
 * delete. We resolve them ourselves first: RSVPs are meaningless without their
 * guest and get removed, while posts and comments are reassigned to the
 * placeholder so other guests' replies don't disappear with them.
 *
 * Runs on `req` so it shares the delete's transaction and rolls back with it.
 */
export async function releaseUserContent(req: PayloadRequest, userId: number): Promise<void> {
  // The placeholder cannot be reassigned to itself.
  if (await isDeletedGuest(req, userId)) return

  await req.payload.delete({
    collection: 'rsvps',
    where: { user: { equals: userId } },
    overrideAccess: true,
    req,
  })

  // Reactions go with the guest rather than moving to the placeholder — a count
  // is only meaningful while the people behind it still exist.
  await req.payload.delete({
    collection: 'reactions',
    where: { user: { equals: userId } },
    overrideAccess: true,
    req,
  })

  const placeholder = await getDeletedGuestId(req)

  for (const collection of ['posts', 'comments'] as const) {
    await req.payload.update({
      collection,
      where: { author: { equals: userId } },
      data: { author: placeholder },
      overrideAccess: true,
      req,
    })
  }
}

async function isDeletedGuest(req: PayloadRequest, userId: number): Promise<boolean> {
  const { docs } = await req.payload.find({
    collection: 'users',
    where: { and: [{ id: { equals: userId } }, { email: { equals: DELETED_GUEST_EMAIL } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  return docs.length > 0
}
