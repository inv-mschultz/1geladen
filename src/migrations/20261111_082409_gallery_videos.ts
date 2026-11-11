import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-vercel-postgres'

/**
 * Gallery videos (see lib/video): `events.videos_allowed`, the per-party
 * greenlight only platform admins can set, and `media.poster_id`, the still
 * frame a video shows in the grid. Off for every existing party.
 */

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "events" ADD COLUMN "videos_allowed" boolean DEFAULT false;
  ALTER TABLE "media" ADD COLUMN "poster_id" integer;
  ALTER TABLE "media" ADD CONSTRAINT "media_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "media_poster_idx" ON "media" USING btree ("poster_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" DROP CONSTRAINT "media_poster_id_media_id_fk";
  
  DROP INDEX "media_poster_idx";
  ALTER TABLE "events" DROP COLUMN "videos_allowed";
  ALTER TABLE "media" DROP COLUMN "poster_id";`)
}
