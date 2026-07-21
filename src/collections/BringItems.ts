import type { CollectionConfig, FieldAccess } from 'payload'
import { Forbidden } from 'payload'

import { assertEventMember, isEventMember, isLoggedIn } from '@/access'

const relId = (value: unknown): number | null => {
  if (value == null) return null
  if (typeof value === 'object') return (value as { id: number }).id
  return value as number
}

// Item details may only be edited by the creator or an admin.
// Returning false silently strips the field from the update.
const isAdminOrCreatorField: FieldAccess = ({ req: { user }, doc }) => {
  if (!user) return false
  if (user.role === 'admin') return true
  return relId(doc?.createdBy) === user.id
}

export const BringItems: CollectionConfig = {
  slug: 'bring-items',
  labels: {
    singular: 'Bring item',
    plural: 'Bring items',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'event', 'claimedBy'],
  },
  access: {
    read: isEventMember('event'),
    create: isLoggedIn,
    // Members may update — but everyone, host included, is limited to their own
    // claim via the field access + hook below.
    update: isEventMember('event'),
    // Whoever added it owns it. The host deliberately gets no override here:
    // removing a guest's entry is the guest's call, not the host's.
    delete: ({ req: { user } }) => (user ? { createdBy: { equals: user.id } } : false),
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, req, originalDoc }) => {
        if (operation === 'create') {
          await assertEventMember(req, data.event)
          if (req.user && req.user.role !== 'admin') {
            data.createdBy = req.user.id
            // A guest adding an item is committing to bring it. Only the host
            // puts something on the list for somebody else to pick up.
            data.claimedBy = req.user.id
          }
        }

        // Claims are personal: you may take a free item, or step out of one you
        // took. Nobody de-assigns anybody else — the host included.
        //
        // The one asymmetry: a guest cannot unclaim an item they added, because
        // adding it *was* the commitment to bring it; their exit is deleting the
        // entry. The host can, since they also put things up for others.
        if (operation === 'update' && req.user && data && 'claimedBy' in data) {
          const incoming = relId(data.claimedBy)
          const current = relId(originalDoc?.claimedBy)
          const me = req.user.id
          const iAdded = relId(originalDoc?.createdBy) === me
          const isAdmin = req.user.role === 'admin'
          const claiming = incoming === me && current === null
          const unclaiming = incoming === null && current === me && (isAdmin || !iAdded)
          const unchanged = incoming === current
          if (!claiming && !unclaiming && !unchanged) {
            throw new Forbidden()
          }
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      required: true,
      index: true,
      access: {
        update: isAdminOrCreatorField,
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: { description: 'e.g. "Kartoffelsalat", "Wine (red)", "Good mood"' },
      access: {
        update: isAdminOrCreatorField,
      },
    },
    {
      name: 'note',
      type: 'text',
      admin: { description: 'Optional details — "enough for 12 people"' },
      access: {
        update: isAdminOrCreatorField,
      },
    },
    {
      name: 'claimedBy',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      admin: { description: 'Who is bringing this? Empty = up for grabs.' },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      defaultValue: ({ user }) => user?.id,
      admin: { readOnly: true, position: 'sidebar' },
      access: {
        update: ({ req: { user } }) => user?.role === 'admin',
      },
    },
  ],
}
