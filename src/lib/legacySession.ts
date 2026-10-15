import { createHmac, timingSafeEqual } from 'crypto'
import type { AuthStrategy } from 'payload'

/**
 * Keeps sessions from before the Payload 3.90 upgrade alive.
 *
 * 3.90 stamps `authVersion` into the JWT header and refuses every token
 * without it, so deploying it logs everybody out. People with a password log
 * back in; invite-link guests cannot — they never saw theirs, the cookie was
 * the account. Re-joining by link would give them a second account with none
 * of their RSVPs or posts.
 *
 * So this accepts exactly the old format and nothing looser than Payload did
 * before: a valid HS256 signature with our secret, not expired, for a users
 * row whose session is still on record. Anything carrying `authVersion` is
 * left to Payload's own check untouched.
 *
 * Delete this file (and its line in Users) 30 days after the 3.90 deploy:
 * tokens live 30 days (Users auth.tokenExpiration) and Payload no longer
 * issues the old format, so by then every token it could accept has expired.
 */

type Header = { alg?: unknown; authVersion?: unknown }
type Claims = { id?: unknown; collection?: unknown; sid?: unknown; exp?: unknown }

const decode = <T>(part: string): T | null => {
  try {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as T
  } catch {
    return null
  }
}

const tokenFrom = (headers: Headers, cookieName: string): string | null => {
  const auth = headers.get('Authorization')
  if (auth?.startsWith('JWT ')) return auth.slice(4)
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  for (const pair of (headers.get('Cookie') ?? '').split(';')) {
    const [name, ...value] = pair.trim().split('=')
    if (name === cookieName) return decodeURIComponent(value.join('='))
  }
  return null
}

export const legacySessionStrategy: AuthStrategy = {
  name: 'legacy-jwt',
  authenticate: async ({ headers, payload, req, strategyName }) => {
    const none = { user: null }

    const token = tokenFrom(headers, `${payload.config.cookiePrefix}-token`)
    const parts = token?.split('.')
    if (!parts || parts.length !== 3) return none

    // The common case on every request: a current token. Bail before any
    // crypto or query, Payload's own strategy runs next.
    const header = decode<Header>(parts[0])
    if (!header || header.alg !== 'HS256' || header.authVersion !== undefined) return none

    const expected = createHmac('sha256', payload.secret).update(`${parts[0]}.${parts[1]}`).digest()
    const given = Buffer.from(parts[2], 'base64url')
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return none

    const claims = decode<Claims>(parts[1])
    if (!claims || claims.collection !== 'users') return none
    if (typeof claims.id !== 'number' || typeof claims.sid !== 'string') return none
    if (typeof claims.exp !== 'number' || claims.exp * 1000 <= Date.now()) return none

    const user = await payload
      .findByID({
        collection: 'users',
        id: claims.id,
        depth: payload.collections.users.config.auth.depth,
        overrideAccess: true,
        req,
      })
      .catch(() => null)
    if (!user) return none

    // Logging out removes the session from the user, which must still end it.
    const session = (user.sessions ?? []).find(({ id }) => id === claims.sid)
    if (!session || new Date(session.expiresAt).getTime() <= Date.now()) return none

    return {
      user: Object.assign(user, { collection: 'users', _strategy: strategyName, _sid: claims.sid }),
    }
  },
}
