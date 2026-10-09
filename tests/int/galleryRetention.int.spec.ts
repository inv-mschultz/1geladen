// Node, not jsdom: under jsdom the Buffer sharp returns comes from another
// realm and Payload's file-type sniffing rejects the upload.
// @vitest-environment node
/**
 * Galleries retire 30 days after the party: the photos go, the cover image and
 * the event stay, and uploads stop. Storage is what the free tier runs out of
 * first, so this is the part that keeps 1geladen free.
 */
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { User } from '@/payload-types'
import config from '@/payload.config'
import { retireDueGalleries } from '@/lib/retireGalleries'

const MARK = 'retention-fixture'
const DAY = 86_400_000

let payload: Payload
let host: User
let png: Buffer

const makeEvent = (slug: string, daysAgo: number) =>
  payload.create({
    collection: 'events',
    data: {
      title: `${MARK} ${slug}`,
      slug: `${MARK}-${slug}`,
      date: new Date(Date.now() - daysAgo * DAY).toISOString(),
      createdBy: host.id,
    },
    overrideAccess: true,
  })

const upload = (eventId: number, name: string) =>
  payload.create({
    collection: 'media',
    file: { data: png, name, mimetype: 'image/png', size: png.length },
    data: { event: eventId, alt: name },
    user: host,
  })

const photosOf = async (eventId: number) =>
  (
    await payload.find({
      collection: 'media',
      where: { event: { equals: eventId } },
      depth: 0,
      overrideAccess: true,
    })
  ).docs.map((doc) => doc.id)

async function cleanup(): Promise<void> {
  const { docs } = await payload.find({
    collection: 'events',
    where: { slug: { like: MARK } },
    depth: 0,
    overrideAccess: true,
  })
  for (const event of docs) {
    await payload.delete({ collection: 'events', id: event.id, overrideAccess: true })
  }
  await payload.delete({
    collection: 'users',
    where: { name: { like: MARK } },
    overrideAccess: true,
  })
}

describe('gallery retention', () => {
  beforeAll(async () => {
    process.env.LEGACY_GLOBAL_ADMIN = '0'
    payload = await getPayload({ config: await config })
    await cleanup()
    host = (await payload.create({
      collection: 'users',
      data: {
        name: `${MARK}-host`,
        email: `${MARK}-host@example.test`,
        password: 'partey2010',
        role: 'guest',
      },
      overrideAccess: true,
    })) as User
    png = await sharp({
      create: { width: 32, height: 32, channels: 3, background: '#ff8ad4' },
    })
      .png()
      .toBuffer()
  })

  afterAll(async () => {
    delete process.env.LEGACY_GLOBAL_ADMIN
    if (payload) await cleanup()
  })

  it('deletes an old party’s photos but keeps its cover, and leaves recent parties alone', async () => {
    // Photos have to arrive while the gallery is still open, so the old party
    // starts recent and is moved back in time afterwards.
    const old = await makeEvent('old', 1)
    const recent = await makeEvent('recent', 5)
    const cover = await upload(old.id, 'cover.png')
    await upload(old.id, 'a.png')
    await upload(old.id, 'b.png')
    const keep = await upload(recent.id, 'c.png')

    await payload.update({
      collection: 'events',
      id: old.id,
      data: { date: new Date(Date.now() - 40 * DAY).toISOString(), coverImage: cover.id },
      overrideAccess: true,
    })

    const result = await retireDueGalleries(payload)

    expect(result.retired).toBeGreaterThanOrEqual(1)
    expect(await photosOf(old.id)).toEqual([cover.id])
    expect(await photosOf(recent.id)).toEqual([keep.id])

    const after = await payload.findByID({ collection: 'events', id: old.id, depth: 0, overrideAccess: true })
    expect(after.galleryRetiredAt).toBeTruthy()

    // A second run finds nothing left to do for this event.
    const again = await retireDueGalleries(payload)
    expect(await photosOf(old.id)).toEqual([cover.id])
    expect(again.photos).toBe(0)
  })

  it('stores a big photo at most 1600 px wide, with one 800 px card', async () => {
    const event = await makeEvent('sizes', 1)
    const big = await sharp({
      create: { width: 3000, height: 2000, channels: 3, background: '#4ce6a5' },
    })
      .jpeg()
      .toBuffer()
    const doc = await payload.create({
      collection: 'media',
      file: { data: big, name: 'big.jpg', mimetype: 'image/jpeg', size: big.length },
      data: { event: event.id, alt: 'big' },
      user: host,
    })
    expect(doc.width).toBe(1600)
    expect(Object.keys(doc.sizes ?? {})).toEqual(['card'])
    expect(doc.sizes?.card?.width).toBe(800)
  })

  it('refuses uploads once the gallery is due, even before the cron has run', async () => {
    const due = await makeEvent('due', 35)
    await expect(upload(due.id, 'late.png')).rejects.toThrow(/retired/)
  })
})
