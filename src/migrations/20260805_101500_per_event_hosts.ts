import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-vercel-postgres'

/**
 * Seeds `events.hosts` from `events.createdBy`, so per-event admin rights have
 * something to stand on before the global `role === 'admin'` bypass goes away.
 *
 * No DDL. `hosts` is another hasMany relationship to users, and Payload keeps
 * every Events relationship in `events_rels`, discriminated by `path` — the
 * `users_id` column already exists for `members`. That makes this migration
 * additive *and* backward compatible: old code simply ignores path='hosts'
 * rows, so rolling the code back needs no migration rollback.
 *
 * All three statements are idempotent (`WHERE NOT EXISTS`), so re-running is
 * safe and this doubles as the repair tool if an event ever ends up hostless.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  // 1. The normal case: whoever created the event becomes its first host.
  await db.execute(sql`
    INSERT INTO "events_rels" ("order", "parent_id", "path", "users_id")
    SELECT 1, e."id", 'hosts', e."created_by_id"
      FROM "events" e
     WHERE e."created_by_id" IS NOT NULL
       AND NOT EXISTS (
             SELECT 1 FROM "events_rels" r
              WHERE r."parent_id" = e."id" AND r."path" = 'hosts'
           );`)

  // 2. Events whose creator was nulled out (the FK is ON DELETE SET NULL) fall
  //    back to their first member, then to the oldest admin — the same fallback
  //    20260717_122010 used to seed created_by_id. Without this they would be
  //    unreadable, uneditable and undeletable by everyone, permanently: there is
  //    no global admin left to rescue them.
  await db.execute(sql`
    INSERT INTO "events_rels" ("order", "parent_id", "path", "users_id")
    SELECT 1, e."id", 'hosts', COALESCE(
             (SELECT r."users_id" FROM "events_rels" r
               WHERE r."parent_id" = e."id" AND r."path" = 'members'
                 AND r."users_id" IS NOT NULL
               ORDER BY r."order" LIMIT 1),
             (SELECT u."id" FROM "users" u WHERE u."role" = 'admin' ORDER BY u."id" LIMIT 1))
      FROM "events" e
     WHERE NOT EXISTS (
             SELECT 1 FROM "events_rels" r
              WHERE r."parent_id" = e."id" AND r."path" = 'hosts'
           )
       AND COALESCE(
             (SELECT r."users_id" FROM "events_rels" r
               WHERE r."parent_id" = e."id" AND r."path" = 'members'
                 AND r."users_id" IS NOT NULL
               ORDER BY r."order" LIMIT 1),
             (SELECT u."id" FROM "users" u WHERE u."role" = 'admin' ORDER BY u."id" LIMIT 1)
           ) IS NOT NULL;`)

  // 3. Hosts are implicitly on the guest list. This is not cosmetic: events
  //    created inside /admin never went through the frontend createEvent action,
  //    which is the only thing that writes `members` — so their creator is in
  //    created_by_id but not in members, and would lose their own event the
  //    moment reads get scoped.
  await db.execute(sql`
    INSERT INTO "events_rels" ("order", "parent_id", "path", "users_id")
    SELECT COALESCE((SELECT MAX(m."order") FROM "events_rels" m
                      WHERE m."parent_id" = h."parent_id" AND m."path" = 'members'), 0) + 1,
           h."parent_id", 'members', h."users_id"
      FROM "events_rels" h
     WHERE h."path" = 'hosts'
       AND NOT EXISTS (
             SELECT 1 FROM "events_rels" m
              WHERE m."parent_id" = h."parent_id" AND m."path" = 'members'
                AND m."users_id" = h."users_id"
           );`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Only the hosts rows. The members rows added by statement 3 are
  // indistinguishable from real guest-list entries — dropping them would
  // corrupt guest lists that were correct before this migration ran.
  await db.execute(sql`DELETE FROM "events_rels" WHERE "path" = 'hosts';`)
}
