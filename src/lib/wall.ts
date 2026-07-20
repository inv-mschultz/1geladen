import type { Payload, TypedUser } from 'payload'

import type { WallPost } from '@/components/Wall'
import type { Media, User } from '@/payload-types'

/**
 * How many wall posts a page load fetches. The wall is the fastest-growing
 * part of an event, and every mutation re-renders the page — so we load a
 * window and let guests pull older posts on demand instead of refetching the
 * whole history on every RSVP, comment or photo upload.
 */
export const WALL_PAGE_SIZE = 20

const asUser = (value: number | User | null | undefined): User | null =>
  typeof value === 'object' && value !== null ? value : null

const asMedia = (value: number | Media | null | undefined): Media | null =>
  typeof value === 'object' && value !== null ? value : null

const mediaUrl = (value: number | Media | null | undefined): string | null => {
  const media = asMedia(value)
  return media?.sizes?.card?.url ?? media?.url ?? null
}

/**
 * Loads one page of wall posts (newest first) together with just the comments
 * belonging to them — previously every render pulled up to 500 comments for
 * the whole event regardless of which posts were on screen.
 */
export async function fetchWallPosts({
  payload,
  user,
  eventId,
  isAdmin,
  before,
}: {
  payload: Payload
  user: TypedUser
  eventId: number
  isAdmin: boolean
  /** ISO date — fetch posts strictly older than this (pagination cursor). */
  before?: string
}): Promise<{ posts: WallPost[]; hasMore: boolean }> {
  const eventFilter = [{ event: { equals: eventId } }]
  const visibility = isAdmin ? [] : [{ deleted: { not_equals: true } }]
  const cursor = before ? [{ createdAt: { less_than: before } }] : []

  const posts = await payload.find({
    collection: 'posts',
    where: { and: [...eventFilter, ...visibility, ...cursor] },
    sort: '-createdAt',
    depth: 1,
    limit: WALL_PAGE_SIZE,
    overrideAccess: false,
    user,
  })

  const postIds = posts.docs.map((post) => post.id)
  const comments = postIds.length
    ? await payload.find({
        collection: 'comments',
        where: { post: { in: postIds } },
        sort: 'createdAt',
        depth: 1,
        limit: 500,
        overrideAccess: false,
        user,
      })
    : { docs: [] as never[] }

  const commentsByPost = new Map<number, WallPost['comments']>()
  for (const comment of comments.docs) {
    const postId = typeof comment.post === 'object' ? comment.post.id : comment.post
    const list = commentsByPost.get(postId) ?? []
    list.push({
      id: comment.id,
      authorName: asUser(comment.author)?.name ?? '?',
      content: comment.content,
      imageUrl: mediaUrl(comment.image),
      gifUrl: comment.gifUrl,
      createdAt: comment.createdAt,
      mine: asUser(comment.author)?.id === user.id,
    })
    commentsByPost.set(postId, list)
  }

  return {
    posts: posts.docs.map((post) => ({
      id: post.id,
      authorName: asUser(post.author)?.name ?? '?',
      content: post.content,
      imageUrl: mediaUrl(post.image),
      gifUrl: post.gifUrl,
      deleted: Boolean(post.deleted),
      mine: asUser(post.author)?.id === user.id,
      createdAt: post.createdAt,
      comments: commentsByPost.get(post.id) ?? [],
    })),
    hasMore: posts.hasNextPage ?? false,
  }
}
