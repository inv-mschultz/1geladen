import type { PayloadRequest } from 'payload'

/**
 * Manual cascades for rows the database won't clean up itself.
 *
 * Payload generates ON DELETE SET NULL for every relationship. Where the column
 * is also NOT NULL the two contradict and the delete aborts (this is what made
 * users undeletable); where the column is nullable the delete succeeds but
 * leaves orphans behind. Both cases are handled here, before the parent goes.
 *
 * Everything runs on the caller's `req` so it shares the delete's transaction.
 */

/** Reactions pointing at a post or a comment. Their FKs are nullable, so this
 *  is about not leaving orphans rather than about the delete succeeding. */
export async function deleteReactionsFor(
  req: PayloadRequest,
  target: { post: number } | { comment: number },
): Promise<void> {
  await req.payload.delete({
    collection: 'reactions',
    where: 'post' in target ? { post: { equals: target.post } } : { comment: { equals: target.comment } },
    overrideAccess: true,
    req,
  })
}

/**
 * Clears everything hanging off a post before it is hard-deleted.
 *
 * `comments.post_id` is NOT NULL with an ON DELETE SET NULL foreign key, so
 * without this a post with comments cannot be deleted at all. The wall only
 * soft-deletes, which is why this never surfaced through the UI — but the admin
 * panel deletes for real.
 */
export async function releasePostContent(req: PayloadRequest, postId: number): Promise<void> {
  const { docs } = await req.payload.find({
    collection: 'comments',
    where: { post: { equals: postId } },
    limit: 1000,
    depth: 0,
    overrideAccess: true,
    req,
  })

  // Deleting each comment fires the Comments beforeDelete hook, which clears
  // that comment's own reactions.
  for (const comment of docs) {
    await req.payload.delete({ collection: 'comments', id: comment.id, overrideAccess: true, req })
  }

  await deleteReactionsFor(req, { post: postId })
}
