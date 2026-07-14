import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminFieldLevel, isAdminOrSelf } from '@/access'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role'],
  },
  auth: true,
  access: {
    // Only admins may enter the backstage area
    admin: ({ req: { user } }) => user?.role === 'admin',
    // Anyone may register as a guest; the role field below is admin-locked
    create: () => true,
    read: ({ req: { user } }) => Boolean(user),
    update: isAdminOrSelf,
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [
      // The very first user to sign up becomes the host (admin)
      async ({ data, operation, req }) => {
        if (operation === 'create') {
          const { totalDocs } = await req.payload.count({ collection: 'users' })
          if (totalDocs === 0) {
            data.role = 'admin'
          }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'guest',
      saveToJWT: true,
      options: [
        { label: 'Admin (host)', value: 'admin' },
        { label: 'Guest', value: 'guest' },
      ],
      access: {
        create: isAdminFieldLevel,
        update: isAdminFieldLevel,
      },
    },
  ],
}
