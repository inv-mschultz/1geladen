import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-vercel-postgres'

/**
 * 30-day galleries: `events.gallery_retired_at`, stamped by the daily cleanup
 * cron once an event's photos are gone.
 *
 * Additive on purpose. This config also drops media's 'thumbnail' and 'hero'
 * sizes, and the generated migration dropped their columns too — but
 * migrations run during the build, while the previous deployment still serves
 * traffic and still selects those columns. Drizzle ignores columns the config
 * doesn't know, so they stay for now; a follow-up migration, shipped once this
 * deploy is live, deletes their Blob files and then the columns.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "events" ADD COLUMN "gallery_retired_at" timestamp(3) with time zone;
  CREATE INDEX "events_gallery_retired_at_idx" ON "events" USING btree ("gallery_retired_at");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP INDEX "events_gallery_retired_at_idx";
  ALTER TABLE "events" DROP COLUMN "gallery_retired_at";`)
}
