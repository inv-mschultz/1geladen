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

// The store is connected with a MEDIA_ prefix because the older "Blobby" store
// already holds the default BLOB_ names on this project. Vercel only mints this
// token when "Add a read-write token env var" is ticked — connecting a store now
// defaults to OIDC, which this Payload adapter cannot use.
const blobToken = process.env.MEDIA_READ_WRITE_TOKEN

// Serverless has no writable disk, so on Vercel the Blob plugin is not
// optional: without it Payload silently falls back to writing into ./media
// and every upload dies with EROFS behind an opaque error page. Fail loudly
// at boot instead — locally (no VERCEL) disk storage stays fine.
if (process.env.VERCEL && !blobToken) {
  throw new Error(
    'MEDIA_READ_WRITE_TOKEN is missing. Uploads would fall back to the read-only ' +
      'serverless filesystem. Re-connect the 1geladen-media Blob store in Vercel → ' +
      'Storage with "Add a read-write token env var" ticked, then redeploy.',
  )
}

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
    ...(blobToken
      ? [
          vercelBlobStorage({
            collections: { media: true },
            token: blobToken,
            // NB: not addRandomSuffix. The adapter writes the suffixed name back to
            // the top-level data.filename for *every* file it uploads — original and
            // each imageSize alike — so with sizes configured the sizes keep their
            // un-suffixed (non-existent) names and the doc's own filename ends up
            // being whichever size won the Promise.all race. Media randomises the
            // base filename itself instead; see Media's beforeOperation hook.
          }),
        ]
      : []),
  ],
})
