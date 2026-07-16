// Preflight for the Vercel build: fail early with a clear message if the
// environment isn't configured, instead of a cryptic Payload stack trace.

const hasDatabase = Boolean(process.env.POSTGRES_URL || process.env.DATABASE_URL)

const missing = []
if (!process.env.PAYLOAD_SECRET) missing.push('PAYLOAD_SECRET  (any long random string)')
if (!hasDatabase) missing.push('POSTGRES_URL  (added automatically by the Vercel Neon/Postgres integration)')

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
