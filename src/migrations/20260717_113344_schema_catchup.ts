import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "events_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  ALTER TABLE "users" ADD COLUMN "guest_join" boolean DEFAULT false;
  ALTER TABLE "events" ADD COLUMN "theme_color" varchar;
  ALTER TABLE "events" ADD COLUMN "accent_color" varchar;
  ALTER TABLE "events" ADD COLUMN "invert_theme" boolean DEFAULT false;
  ALTER TABLE "events" ADD COLUMN "invite_token" varchar;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "events_rels_order_idx" ON "events_rels" USING btree ("order");
  CREATE INDEX "events_rels_parent_idx" ON "events_rels" USING btree ("parent_id");
  CREATE INDEX "events_rels_path_idx" ON "events_rels" USING btree ("path");
  CREATE INDEX "events_rels_users_id_idx" ON "events_rels" USING btree ("users_id");
  CREATE INDEX "users_guest_join_idx" ON "users" USING btree ("guest_join");
  CREATE UNIQUE INDEX "events_invite_token_idx" ON "events" USING btree ("invite_token");
  ALTER TABLE "events" DROP COLUMN "location_maps_url";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "events_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "events_rels" CASCADE;
  DROP INDEX "users_guest_join_idx";
  DROP INDEX "events_invite_token_idx";
  ALTER TABLE "events" ADD COLUMN "location_maps_url" varchar;
  ALTER TABLE "users" DROP COLUMN "guest_join";
  ALTER TABLE "events" DROP COLUMN "theme_color";
  ALTER TABLE "events" DROP COLUMN "accent_color";
  ALTER TABLE "events" DROP COLUMN "invert_theme";
  ALTER TABLE "events" DROP COLUMN "invite_token";`)
}
