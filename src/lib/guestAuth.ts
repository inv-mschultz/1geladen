import { randomBytes } from 'crypto'

/**
 * Invite-link guests get a synthetic email and a random password nobody ever
 * sees — their session cookie carries them. Claiming the account (/account)
 * replaces both with real credentials for multi-device login.
 */
export const syntheticGuestEmail = (): string =>
  `gast-${randomBytes(6).toString('hex')}@join.1geladen.de`

export const isSyntheticGuestEmail = (email: string): boolean =>
  email.endsWith('@join.1geladen.de')
