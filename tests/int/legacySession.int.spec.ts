// @vitest-environment node
/**
 * Sessions minted before the Payload 3.90 upgrade keep working until they
 * expire — invite-link guests have no other way back in. See lib/legacySession.
 *
 * Old tokens are rebuilt from a fresh login: same claims, re-signed the way
 * 3.86 signed them (no `authVersion` in the header).
 */
import { createHmac } from 'crypto'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { User } from '@/payload-types'
import config from '@/payload.config'

const MARK = 'legacysession-fixture'
const PASSWORD = 'partey2010'

let payload: Payload
let guest: User

const b64 = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')

const sign = (header: object, claims: object) => {
  const head = `${b64(header)}.${b64(claims)}`
  return `${head}.${createHmac('sha256', payload.secret).update(head).digest('base64url')}`
}

const claimsOf = (token: string) =>
  JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) as Record<
    string,
    unknown
  >

const freshToken = async () => {
  const { token } = await payload.login({
    collection: 'users',
    data: { email: guest.email, password: PASSWORD },
  })
  return token as string
}

const asOldToken = (token: string, overrides: Record<string, unknown> = {}) =>
  sign({ alg: 'HS256', typ: 'JWT' }, { ...claimsOf(token), ...overrides })

const whoIs = async (headers: Record<string, string>) =>
  (await payload.auth({ headers: new Headers(headers) })).user

describe('pre-3.90 sessions', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    const { docs } = await payload.find({
      collection: 'users',
      where: { name: { like: MARK } },
      overrideAccess: true,
    })
    for (const user of docs)
      await payload.delete({ collection: 'users', id: user.id, overrideAccess: true })
    guest = (await payload.create({
      collection: 'users',
      data: {
        name: `${MARK}-guest`,
        email: `gast-${MARK}@join.1geladen.de`,
        password: PASSWORD,
        role: 'guest',
        guestJoin: true,
      },
      overrideAccess: true,
    })) as User
  })

  afterAll(async () => {
    if (guest) await payload.delete({ collection: 'users', id: guest.id, overrideAccess: true })
  })

  it('an old session cookie still logs the guest in', async () => {
    const old = asOldToken(await freshToken())
    const user = await whoIs({ Cookie: `payload-token=${old}` })
    expect(user?.id).toBe(guest.id)
  })

  it('as does the old token in an Authorization header', async () => {
    const old = asOldToken(await freshToken())
    expect((await whoIs({ Authorization: `JWT ${old}` }))?.id).toBe(guest.id)
  })

  it('current tokens are untouched', async () => {
    expect((await whoIs({ Cookie: `payload-token=${await freshToken()}` }))?.id).toBe(guest.id)
  })

  it('a forged signature is refused', async () => {
    const old = asOldToken(await freshToken())
    const [head, body] = old.split('.')
    const forged = `${head}.${body}.${createHmac('sha256', 'not-our-secret').update(`${head}.${body}`).digest('base64url')}`
    expect(await whoIs({ Cookie: `payload-token=${forged}` })).toBeNull()
  })

  it('an expired one is refused', async () => {
    const old = asOldToken(await freshToken(), { exp: Math.floor(Date.now() / 1000) - 60 })
    expect(await whoIs({ Cookie: `payload-token=${old}` })).toBeNull()
  })

  it('claims about another account or collection get nowhere without a matching session', async () => {
    const token = await freshToken()
    expect(
      await whoIs({ Cookie: `payload-token=${asOldToken(token, { sid: 'made-up' })}` }),
    ).toBeNull()
    expect(
      await whoIs({ Cookie: `payload-token=${asOldToken(token, { collection: 'media' })}` }),
    ).toBeNull()
  })

  it('logging out still ends an old session', async () => {
    const old = asOldToken(await freshToken())
    await payload.update({
      collection: 'users',
      id: guest.id,
      data: { sessions: [] },
      overrideAccess: true,
    })
    expect(await whoIs({ Cookie: `payload-token=${old}` })).toBeNull()
  })
})
