/**
 * Anyone with a real account may throw a party.
 *
 * Hosting used to need `role: 'admin'`; now it only needs an account with an
 * email on file. These tests pin that down, together with the two things that
 * make it safe to open up: an event can be deleted cleanly with everything in
 * it, and a person can delete themselves without orphaning anybody's party.
 */
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { User } from '@/payload-types'
import config from '@/payload.config'
import { soleHostedEvents } from '@/lib/membership'

const MARK = 'openhosting-fixture'

let payload: Payload
let host: User
let joiner: User
let friend: User

const refused = async (op: Promise<unknown>): Promise<boolean> =>
  op.then(
    () => false,
    () => true,
  )

const makeUser = (name: string, extra: Partial<User> = {}) =>
  payload.create({
    collection: 'users',
    data: {
      name: `${MARK}-${name}`,
      email: `${MARK}-${name}@example.test`,
      password: 'partey2010',
      role: 'guest',
      ...extra,
    },
    overrideAccess: true,
  }) as Promise<User>

const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString()

async function cleanup(): Promise<void> {
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

describe('open hosting', () => {
  beforeAll(async () => {
    process.env.LEGACY_GLOBAL_ADMIN = '0'
    payload = await getPayload({ config: await config })
    await cleanup()
    host = await makeUser('host')
    joiner = await makeUser('joiner', { guestJoin: true })
    friend = await makeUser('friend')
  })

  afterAll(async () => {
    delete process.env.LEGACY_GLOBAL_ADMIN
    if (payload) await cleanup()
  })

  it('lets a plain registered guest create an event, and makes them its host', async () => {
    const event = await payload.create({
      collection: 'events',
      data: { title: `${MARK} mine`, slug: `${MARK}-mine`, date: tomorrow() },
      overrideAccess: false,
      user: host,
    })
    const ids = (event.hosts ?? []).map((h) => (typeof h === 'object' ? h.id : h))
    expect(ids).toEqual([host.id])
  })

  it('refuses an invite-link guest who has not claimed an account yet', async () => {
    expect(
      await refused(
        payload.create({
          collection: 'events',
          data: { title: `${MARK} nope`, slug: `${MARK}-nope`, date: tomorrow() },
          overrideAccess: false,
          user: joiner,
        }),
      ),
    ).toBe(true)
  })

  it('deletes an event together with its posts, comments, RSVPs and bring items', async () => {
    const event = await payload.create({
      collection: 'events',
      data: {
        title: `${MARK} busy`,
        slug: `${MARK}-busy`,
        date: tomorrow(),
        createdBy: host.id,
        members: [host.id, friend.id],
      },
      overrideAccess: true,
    })
    const post = await payload.create({
      collection: 'posts',
      data: { event: event.id, author: friend.id, content: 'hi' },
      user: friend,
    })
    await payload.create({
      collection: 'comments',
      data: { post: post.id, author: host.id, content: 'hey' },
      user: host,
    })
    await payload.create({
      collection: 'rsvps',
      data: { event: event.id, user: friend.id, status: 'yes' },
      user: friend,
    })
    await payload.create({
      collection: 'bring-items',
      data: { event: event.id, title: 'Kartoffelsalat', createdBy: friend.id },
      user: friend,
    })

    await payload.delete({ collection: 'events', id: event.id, overrideAccess: false, user: host })

    const left = await Promise.all([
      payload.count({ collection: 'posts', where: { event: { equals: event.id } }, overrideAccess: true }),
      payload.count({ collection: 'comments', where: { post: { equals: post.id } }, overrideAccess: true }),
      payload.count({ collection: 'rsvps', where: { event: { equals: event.id } }, overrideAccess: true }),
      payload.count({ collection: 'bring-items', where: { event: { equals: event.id } }, overrideAccess: true }),
    ])
    expect(left.map((r) => r.totalDocs)).toEqual([0, 0, 0, 0])
  })

  it('lets a person delete their own account but nobody else’s', async () => {
    const victim = await makeUser('victim')
    const self = await makeUser('self')
    expect(
      await refused(
        payload.delete({ collection: 'users', id: victim.id, overrideAccess: false, user: self }),
      ),
    ).toBe(true)
    await expect(
      payload.delete({ collection: 'users', id: self.id, overrideAccess: false, user: self }),
    ).resolves.toBeTruthy()
  })

  it('names only the events nobody else runs as going down with the account', async () => {
    const leaver = await makeUser('leaver')
    const solo = await payload.create({
      collection: 'events',
      data: { title: `${MARK} solo`, slug: `${MARK}-solo`, date: tomorrow(), createdBy: leaver.id },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'events',
      data: {
        title: `${MARK} shared`,
        slug: `${MARK}-shared`,
        date: tomorrow(),
        createdBy: leaver.id,
        hosts: [leaver.id, friend.id],
      },
      overrideAccess: true,
    })

    const sole = await soleHostedEvents(payload, leaver.id)
    expect(sole.map((e) => e.id)).toEqual([solo.id])
  })
})
