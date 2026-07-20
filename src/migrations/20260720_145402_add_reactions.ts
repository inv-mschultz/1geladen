import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-vercel-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "reactions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"emoji" varchar NOT NULL,
  	"user_id" integer,
  	"post_id" integer,
  	"comment_id" integer,
  	"event_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "reactions_id" integer;
  ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reactions" ADD CONSTRAINT "reactions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reactions" ADD CONSTRAINT "reactions_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reactions" ADD CONSTRAINT "reactions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "reactions_emoji_idx" ON "reactions" USING btree ("emoji");
  CREATE INDEX "reactions_user_idx" ON "reactions" USING btree ("user_id");
  CREATE INDEX "reactions_post_idx" ON "reactions" USING btree ("post_id");
  CREATE INDEX "reactions_comment_idx" ON "reactions" USING btree ("comment_id");
  CREATE INDEX "reactions_event_idx" ON "reactions" USING btree ("event_id");
  CREATE INDEX "reactions_updated_at_idx" ON "reactions" USING btree ("updated_at");
  CREATE INDEX "reactions_created_at_idx" ON "reactions" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_reactions_fk" FOREIGN KEY ("reactions_id") REFERENCES "public"."reactions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_reactions_id_idx" ON "payload_locked_documents_rels" USING btree ("reactions_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "reactions" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "reactions" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_reactions_fk";
  
  DROP INDEX "payload_locked_documents_rels_reactions_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "reactions_id";`)
}
