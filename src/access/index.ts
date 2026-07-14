import type { Access, FieldAccess } from 'payload'

import type { User } from '@/payload-types'

export const isAdmin: Access = ({ req: { user } }) => user?.role === 'admin'

export const isLoggedIn: Access = ({ req: { user } }) => Boolean(user)

export const anyone: Access = () => true

export const isAdminFieldLevel: FieldAccess = ({ req: { user } }) => user?.role === 'admin'

export const isAdminOrSelf: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.role === 'admin') return true
  return { id: { equals: user.id } }
}

/** Grants full access to admins, otherwise limits to docs where `field` points at the user. */
export const isAdminOrOwner =
  (field: string): Access =>
  ({ req: { user } }) => {
    if (!user) return false
    if (user.role === 'admin') return true
    return { [field]: { equals: user.id } }
  }

export const hasRole = (user: User | null | undefined, role: User['role']): boolean =>
  user?.role === role
