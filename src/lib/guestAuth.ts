import { createHmac, randomBytes } from 'crypto'

/**
 * Invite-link guests get a deterministic password derived from the server
 * secret. Nobody ever types it: joinParty sets it, rejoinParty re-derives it
 * to log the guest back in. Claiming the account replaces it with a real one.
 */
export const derivedGuestPassword = (email: string): string =>
  createHmac('sha256', process.env.PAYLOAD_SECRET || '')
    .update(`guest-login:${email.toLowerCase()}`)
    .digest('hex')

export const syntheticGuestEmail = (): string =>
  `gast-${randomBytes(6).toString('hex')}@join.1geladen.de`

export const isSyntheticGuestEmail = (email: string): boolean =>
  email.endsWith('@join.1geladen.de')
