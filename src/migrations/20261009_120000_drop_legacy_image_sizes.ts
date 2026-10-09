import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-vercel-postgres'
import { del } from '@vercel/blob'

/**
 * Second half of 20261009_083908_gallery_retention: media's 'thumbnail' and
 * 'hero' sizes went away in that deploy, their columns stayed so the deployment
 * before it kept working through the build. That deployment is gone now.
 *
 * Their files are still in the Blob store, and once the columns are dropped
 * nothing knows they exist — so the filenames are read first, the columns
 * dropped, and the files deleted last. The adapter stores each file under its
 * bare filename (no prefix configured) and `del` takes pathnames. Deleting is
 * best effort: a failure leaves orphaned files, never a failed deploy.
 */
export async function up({ db, payload }: MigrateUpArgs): Promise<void> {
  const { rows } = await db.execute(sql`
    SELECT "sizes_thumbnail_filename" AS a, "sizes_hero_filename" AS b FROM "media"
     WHERE "sizes_thumbnail_filename" IS NOT NULL OR "sizes_hero_filename" IS NOT NULL;`)
  const pathnames = (rows as { a: string | null; b: string | null }[])
    .flatMap((row) => [row.a, row.b])
    .filter((name): name is string => typeof name === 'string' && name.length > 0)

  await db.execute(sql`
  DROP INDEX IF EXISTS "media_sizes_thumbnail_sizes_thumbnail_filename_idx";
  DROP INDEX IF EXISTS "media_sizes_hero_sizes_hero_filename_idx";
  ALTER TABLE "media" DROP COLUMN "sizes_thumbnail_url";
  ALTER TABLE "media" DROP COLUMN "sizes_thumbnail_width";
  ALTER TABLE "media" DROP COLUMN "sizes_thumbnail_height";
  ALTER TABLE "media" DROP COLUMN "sizes_thumbnail_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_thumbnail_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_thumbnail_filename";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_url";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_width";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_height";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_hero_filename";`)

  const token = process.env.MEDIA_READ_WRITE_TOKEN
  if (!token) {
    payload.logger.warn(`MEDIA_READ_WRITE_TOKEN not set; ${pathnames.length} old size files stay in Blob.`)
    return
  }
  try {
    for (let i = 0; i < pathnames.length; i += 100) {
      await del(pathnames.slice(i, i + 100), { token })
    }
    payload.logger.info(`Deleted ${pathnames.length} old image-size files from Blob.`)
  } catch (err) {
    payload.logger.warn({ err, msg: 'Could not delete old image-size files; they stay as orphans.' })
  }
}

/** Brings the columns back, empty. The deleted files cannot be. */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "media" ADD COLUMN "sizes_thumbnail_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_thumbnail_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_thumbnail_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_thumbnail_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_thumbnail_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_thumbnail_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_hero_filename" varchar;
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_hero_sizes_hero_filename_idx" ON "media" USING btree ("sizes_hero_filename");`)
}
