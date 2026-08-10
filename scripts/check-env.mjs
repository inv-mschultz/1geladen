// Preflight for the Vercel build: fail early with a clear message if the
// environment isn't configured, instead of a cryptic Payload stack trace.

const hasDatabase = Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL)

const missing = []
if (!process.env.PAYLOAD_SECRET) missing.push('PAYLOAD_SECRET  (any long random string)')
if (!hasDatabase) missing.push('POSTGRES_URL  (added automatically by the Vercel Neon/Postgres integration)')
// Without this the Blob plugin never loads and uploads try to write to the
// read-only serverless filesystem. A connected store alone is not enough — the
// Payload adapter needs the vercel_blob_rw_… token, which Vercel only creates
// when "Add a read-write token env var" is ticked on the connection.
if (process.env.VERCEL && !process.env.MEDIA_READ_WRITE_TOKEN)
  missing.push('MEDIA_READ_WRITE_TOKEN  (Vercel → Storage → 1geladen-media → read-write token)')

if (missing.length > 0) {
  console.error(
    [
      '',
      '✗ Cannot build: missing required environment variable(s):',
      ...missing.map((line) => `    - ${line}`),
      '',
      '  Add them in Vercel → Project → Settings → Environment Variables',
      '  (tick Production, Preview and Development), then redeploy.',
      '',
    ].join('\n'),
  )
  process.exit(1)
}

console.log('✓ Required environment variables present — continuing build')
