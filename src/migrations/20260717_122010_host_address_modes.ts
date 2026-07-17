import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "events" ADD COLUMN "location_street" varchar;
  ALTER TABLE "events" ADD COLUMN "location_zip" varchar;
  ALTER TABLE "events" ADD COLUMN "location_city" varchar;
  ALTER TABLE "events" ADD COLUMN "accent_color_light" varchar;
  ALTER TABLE "events" ADD COLUMN "created_by_id" integer;
  ALTER TABLE "events" ADD CONSTRAINT "events_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "events_created_by_idx" ON "events" USING btree ("created_by_id");
  UPDATE "events" SET "location_street" = "location_address";
  UPDATE "events" SET "created_by_id" = (SELECT "id" FROM "users" WHERE "role" = 'admin' ORDER BY "id" LIMIT 1) WHERE "created_by_id" IS NULL;
  ALTER TABLE "events" DROP COLUMN "location_address";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "events" DROP CONSTRAINT "events_created_by_id_users_id_fk";
  
  DROP INDEX "events_created_by_idx";
  ALTER TABLE "events" ADD COLUMN "location_address" varchar;
  ALTER TABLE "events" DROP COLUMN "location_street";
  ALTER TABLE "events" DROP COLUMN "location_zip";
  ALTER TABLE "events" DROP COLUMN "location_city";
  ALTER TABLE "events" DROP COLUMN "accent_color_light";
  ALTER TABLE "events" DROP COLUMN "created_by_id";`)
}
