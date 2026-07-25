import type { ImageVariant, ResolveImageUrl } from './authImageContext'

// In-memory cache of resolved signed URLs, keyed by imageId+variant. We cache the URL string (not a
// blob) because the browser HTTP-caches the image bytes once an <img> loads them — all we're saving
// is the round trip to resolve the signed URL. Concurrent requests for the same key dedupe to one.
//
// The signed URLs are time-limited; a session-lifetime memory cache is well within that window, and
// clearImageCache() drops everything on logout / user change so one user's URLs never leak to another.

const cache = new Map<string, string>()
const inflight = new Map<string, Promise<string>>()

const keyOf = (imageId: string, variant: ImageVariant): string => `${imageId}::${variant}`

export function getCachedImageUrl(
  imageId: string,
  variant: ImageVariant,
  resolve: ResolveImageUrl,
): Promise<string> {
  const key = keyOf(imageId, variant)

  const cached = cache.get(key)
  if (cached) return Promise.resolve(cached)

  const pending = inflight.get(key)
  if (pending) return pending

  const task = resolve(imageId, variant).then((url) => {
    cache.set(key, url)
    return url
  })
  inflight.set(key, task)
  // Clear the in-flight marker whether it resolved or rejected, so a later retry starts fresh.
  task.finally(() => {
    if (inflight.get(key) === task) inflight.delete(key)
  }).catch(() => {})
  return task
}

/** Forget one entry — used when a decoded <img> then errors (stale/expired URL) so a retry re-resolves. */
export function evictCachedImageUrl(imageId: string, variant: ImageVariant): void {
  cache.delete(keyOf(imageId, variant))
  inflight.delete(keyOf(imageId, variant))
}

/** Drop everything. Call on logout or a signed-in-user change. */
export function clearImageCache(): void {
  cache.clear()
  inflight.clear()
}
