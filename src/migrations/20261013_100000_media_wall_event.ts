import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-vercel-postgres'

/**
 * `media.wall_event`: which party's wall a post or comment image belongs to.
 *
 * Those images used to carry no event at all, and media with no event was
 * readable by any logged-in account — so a throwaway signup could list every
 * party's wall photos. Read access is now scoped by this column; the backfill
 * stamps every existing attachment from the post (or the comment's post) it
 * illustrates, so nothing already on a wall disappears for its own guests.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "media" ADD COLUMN "wall_event_id" integer;
  ALTER TABLE "media" ADD CONSTRAINT "media_wall_event_id_events_id_fk" FOREIGN KEY ("wall_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "media_wall_event_idx" ON "media" USING btree ("wall_event_id");

  UPDATE "media" SET "wall_event_id" = "posts"."event_id"
    FROM "posts"
   WHERE "posts"."image_id" = "media"."id" AND "media"."event_id" IS NULL;

  UPDATE "media" SET "wall_event_id" = "posts"."event_id"
    FROM "comments" JOIN "posts" ON "posts"."id" = "comments"."post_id"
   WHERE "comments"."image_id" = "media"."id"
     AND "media"."event_id" IS NULL AND "media"."wall_event_id" IS NULL;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "media" DROP CONSTRAINT "media_wall_event_id_events_id_fk";
  DROP INDEX IF EXISTS "media_wall_event_idx";
  ALTER TABLE "media" DROP COLUMN "wall_event_id";`)
}
