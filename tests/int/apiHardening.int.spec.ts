// @vitest-environment node
/**
 * The REST API is open to every account, and anybody can make one. These pin
 * down the holes that came out of the pre-launch review: what a determined
 * account can do with /api directly, past whatever the UI offers.
 *
 * Field access that says no strips the field rather than throwing, so most
 * assertions read the doc back instead of expecting a rejection.
 */
import sharp from 'sharp'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { relId, toIds } from '@/access'
import { addEventMember } from '@/lib/membership'
import type { User } from '@/payload-types'
import config from '@/payload.config'

const MARK = 'hardening-fixture'

let payload: Payload
let mallory: User
let host: User
let guest: User
let stranger: User
let partyId: number
let malloryPartyId: number

const makeUser = (name: string) =>
  payload.create({
    collection: 'users',
    data: {
      name: `${MARK}-${name}`,
      email: `${MARK}-${name}@example.test`,
      password: 'partey2010',
      role: 'guest',
    },
    overrideAccess: true,
  }) as Promise<User>

const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString()

const png = () =>
  sharp({ create: { width: 8, height: 8, channels: 3, background: '#4ce6a5' } })
    .png()
    .toBuffer()

const upload = async (user: User, data: Record<string, unknown>) => {
  const buffer = await png()
  return payload.create({
    collection: 'media',
    file: { data: buffer, name: 'IMG_0001.png', mimetype: 'image/png', size: buffer.length },
    data: { alt: MARK, ...data },
    overrideAccess: false,
    user,
  })
}

async function cleanup(): Promise<void> {
  await payload.delete({
    collection: 'media',
    where: { alt: { equals: MARK } },
    overrideAccess: true,
  })
  const { docs: events } = await payload.find({
    collection: 'events',
    where: { slug: { like: MARK } },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })
  for (const event of events) {
    await payload.delete({ collection: 'events', id: event.id, overrideAccess: true })
  }
  const { docs: users } = await payload.find({
    collection: 'users',
    where: { name: { like: MARK } },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })
  for (const user of users) {
    await payload.delete({ collection: 'users', id: user.id, overrideAccess: true }).catch(() => {})
  }
}

describe('API hardening', () => {
  beforeAll(async () => {
    process.env.LEGACY_GLOBAL_ADMIN = '0'
    payload = await getPayload({ config: await config })
    await cleanup()
    mallory = await makeUser('mallory')
    host = await makeUser('host')
    guest = await makeUser('guest')
    stranger = await makeUser('stranger')

    partyId = (
      await payload.create({
        collection: 'events',
        data: { title: `${MARK} party`, slug: `${MARK}-party`, date: tomorrow(), hosts: [host.id] },
        overrideAccess: true,
      })
    ).id
    await addEventMember(
      payload,
      await payload.findByID({ collection: 'events', id: partyId, overrideAccess: true }),
      guest.id,
    )

    malloryPartyId = (
      await payload.create({
        collection: 'events',
        data: {
          title: `${MARK} mallory`,
          slug: `${MARK}-mallory`,
          date: tomorrow(),
          hosts: [mallory.id],
        },
        overrideAccess: false,
        user: mallory,
      })
    ).id
  })

  afterAll(async () => {
    delete process.env.LEGACY_GLOBAL_ADMIN
    if (payload) await cleanup()
  })

  describe('guest list', () => {
    it('a host cannot pull strangers onto their guest list', async () => {
      await payload.update({
        collection: 'events',
        id: malloryPartyId,
        data: { members: [mallory.id, host.id, guest.id] },
        overrideAccess: false,
        user: mallory,
      })
      const event = await payload.findByID({
        collection: 'events',
        id: malloryPartyId,
        depth: 0,
        overrideAccess: true,
      })
      expect(toIds(event.members)).toEqual([mallory.id])
    })

    it('nor make a stranger co-host', async () => {
      await payload.update({
        collection: 'events',
        id: malloryPartyId,
        data: { hosts: [mallory.id, stranger.id] },
        overrideAccess: false,
        user: mallory,
      })
      const event = await payload.findByID({
        collection: 'events',
        id: malloryPartyId,
        depth: 0,
        overrideAccess: true,
      })
      expect(toIds(event.hosts)).toEqual([mallory.id])
      expect(toIds(event.members)).toEqual([mallory.id])
    })

    it('nor seed a new event with them', async () => {
      const event = await payload.create({
        collection: 'events',
        data: {
          title: `${MARK} seeded`,
          slug: `${MARK}-seeded`,
          date: tomorrow(),
          hosts: [mallory.id],
          members: [mallory.id, guest.id],
        },
        overrideAccess: false,
        user: mallory,
      })
      expect(toIds(event.members)).toEqual([mallory.id])
    })

    it('but can still promote a guest and drop one', async () => {
      await payload.update({
        collection: 'events',
        id: partyId,
        data: { hosts: [host.id, guest.id] },
        overrideAccess: false,
        user: host,
      })
      let event = await payload.findByID({
        collection: 'events',
        id: partyId,
        depth: 0,
        overrideAccess: true,
      })
      expect(toIds(event.hosts).sort()).toEqual([host.id, guest.id].sort())

      await payload.update({
        collection: 'events',
        id: partyId,
        data: { hosts: [host.id] },
        overrideAccess: false,
        user: host,
      })
      event = await payload.findByID({
        collection: 'events',
        id: partyId,
        depth: 0,
        overrideAccess: true,
      })
      expect(toIds(event.hosts)).toEqual([host.id])
    })
  })

  describe('content stays where it was posted', () => {
    it('a post cannot be moved into another party or handed to another author', async () => {
      const post = await payload.create({
        collection: 'posts',
        data: { event: malloryPartyId, author: mallory.id, content: 'hi' },
        overrideAccess: false,
        user: mallory,
      })
      const after = await payload.update({
        collection: 'posts',
        id: post.id,
        data: { event: partyId, author: host.id, content: 'edited' },
        overrideAccess: false,
        user: mallory,
        depth: 0,
      })
      expect(relId(after.event)).toBe(malloryPartyId)
      expect(relId(after.author)).toBe(mallory.id)
      expect(after.content).toBe('edited')
    })

    it('nor can a comment, an RSVP or a bring item', async () => {
      const theirPost = await payload.create({
        collection: 'posts',
        data: { event: partyId, author: host.id, content: 'welcome' },
        overrideAccess: false,
        user: host,
      })
      const myPost = await payload.create({
        collection: 'posts',
        data: { event: malloryPartyId, author: mallory.id, content: 'mine' },
        overrideAccess: false,
        user: mallory,
      })
      const comment = await payload.create({
        collection: 'comments',
        data: { post: myPost.id, author: mallory.id, content: 'hey' },
        overrideAccess: false,
        user: mallory,
      })
      const movedComment = await payload.update({
        collection: 'comments',
        id: comment.id,
        data: { post: theirPost.id, author: host.id },
        overrideAccess: false,
        user: mallory,
        depth: 0,
      })
      expect(relId(movedComment.post)).toBe(myPost.id)
      expect(relId(movedComment.author)).toBe(mallory.id)

      const rsvp = await payload.create({
        collection: 'rsvps',
        data: { event: malloryPartyId, user: mallory.id, status: 'yes' },
        overrideAccess: false,
        user: mallory,
      })
      const movedRsvp = await payload.update({
        collection: 'rsvps',
        id: rsvp.id,
        data: { event: partyId },
        overrideAccess: false,
        user: mallory,
        depth: 0,
      })
      expect(relId(movedRsvp.event)).toBe(malloryPartyId)

      const item = await payload.create({
        collection: 'bring-items',
        data: { event: malloryPartyId, title: 'Spam' },
        overrideAccess: false,
        user: mallory,
      })
      const movedItem = await payload.update({
        collection: 'bring-items',
        id: item.id,
        data: { event: partyId },
        overrideAccess: false,
        user: mallory,
        depth: 0,
      })
      expect(relId(movedItem.event)).toBe(malloryPartyId)
    })
  })

  describe('photos', () => {
    it('wall images are visible to that party only', async () => {
      const image = await upload(guest, { wallEvent: partyId })

      const seen = async (user: User) =>
        (
          await payload.find({
            collection: 'media',
            where: { id: { equals: image.id } },
            overrideAccess: false,
            user,
          })
        ).totalDocs

      expect(await seen(host)).toBe(1)
      expect(await seen(stranger)).toBe(0)
      expect(await seen(mallory)).toBe(0)
    })

    it('a wall image can only be posted into a party you belong to', async () => {
      await expect(upload(stranger, { wallEvent: partyId })).rejects.toThrow()
    })

    it('an eventless upload is seen by people who share a party with the uploader, nobody else', async () => {
      const image = await upload(host, {})
      const seenBy = async (user: User) =>
        (
          await payload.find({
            collection: 'media',
            where: { id: { equals: image.id } },
            overrideAccess: false,
            user,
          })
        ).totalDocs
      expect(await seenBy(guest)).toBe(1)
      expect(await seenBy(stranger)).toBe(0)
    })

    it('a photo cannot be moved into another gallery or re-attributed', async () => {
      const image = await upload(mallory, { event: malloryPartyId })
      const after = await payload.update({
        collection: 'media',
        id: image.id,
        data: { event: partyId, uploadedBy: host.id, caption: 'moved?' },
        overrideAccess: false,
        user: mallory,
        depth: 0,
      })
      expect(relId(after.event)).toBe(malloryPartyId)
      expect(relId(after.uploadedBy)).toBe(mallory.id)
    })
  })

  describe('email addresses', () => {
    it('guests see each other’s names but not their addresses', async () => {
      const other = await payload.findByID({
        collection: 'users',
        id: host.id,
        overrideAccess: false,
        user: guest,
      })
      expect(other.name).toBe(host.name)
      expect(other.email).toBeUndefined()

      const self = await payload.findByID({
        collection: 'users',
        id: guest.id,
        overrideAccess: false,
        user: guest,
      })
      expect(self.email).toBe(guest.email)
    })

    it('the email cannot be used to probe for addresses either', async () => {
      await expect(
        payload.find({
          collection: 'users',
          where: { email: { equals: host.email } },
          overrideAccess: false,
          user: guest,
        }),
      ).rejects.toThrow()
    })

    it('logging in still works', async () => {
      const login = await payload.login({
        collection: 'users',
        data: { email: guest.email, password: 'partey2010' },
      })
      expect(login.token).toBeTruthy()
    })
  })
})
