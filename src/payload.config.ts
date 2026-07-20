import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { vercelPostgresAdapter } from '@payloadcms/db-vercel-postgres'
import { vercelBlobStorage } from '@payloadcms/storage-vercel-blob'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { BringItems } from './collections/BringItems'
import { Comments } from './collections/Comments'
import { Events } from './collections/Events'
import { Media } from './collections/Media'
import { Posts } from './collections/Posts'
import { Reactions } from './collections/Reactions'
import { RSVPs } from './collections/RSVPs'
import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Local dev runs on SQLite (DATABASE_URL=file:...); production runs on
// Vercel/Neon Postgres (POSTGRES_URL, provided by the Vercel integration).
const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || ''

const db = databaseUrl.startsWith('file:')
  ? sqliteAdapter({
      client: { url: databaseUrl },
    })
  : vercelPostgresAdapter({
      pool: { connectionString: databaseUrl },
      migrationDir: path.resolve(dirname, 'migrations'),
    })

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' — 1geladen',
    },
  },
  collections: [Users, Events, Posts, Comments, BringItems, RSVPs, Reactions, Media],
  localization: {
    locales: [
      { label: 'Deutsch', code: 'de' },
      { label: 'English', code: 'en' },
    ],
    defaultLocale: 'de',
    fallback: true,
  },
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db,
  sharp,
  plugins: [
    // Uploads go to Vercel Blob in production (serverless has no persistent disk)
    ...(process.env.BLOB_READ_WRITE_TOKEN
      ? [
          vercelBlobStorage({
            collections: { media: true },
            token: process.env.BLOB_READ_WRITE_TOKEN,
          }),
        ]
      : []),
  ],
})
