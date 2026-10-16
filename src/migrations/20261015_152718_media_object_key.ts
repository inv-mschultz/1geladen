import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-vercel-postgres'

/**
 * The Vercel Blob storage plugin in Payload 3.90 adds a hidden `_objectKey`
 * field to every upload collection. Local dev runs without the plugin, so the
 * 3.90 migration missed it — and every query on media then failed in the
 * preview. Additive and nullable, like the others in this upgrade.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "_objectkey" varchar;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "media" DROP COLUMN IF EXISTS "_objectkey";`)
}
