import { createContext, useContext, type ReactNode } from 'react'

export type ImageVariant = 'thumb' | 'preview' | 'full'

/**
 * App-supplied resolver: given an image id and variant, return a displayable URL for an
 * `<img src>`. Each app implements this with its own API base, auth token, and endpoint — that's
 * the only app-specific seam. For the rtar web apps this calls `GET /images/{id}/url` (which returns
 * the signed storage URL as JSON) with the Bearer token; the resulting URL is used directly in an
 * `<img>`, which — unlike a fetch of `/redirect` — isn't subject to CORS.
 *
 * Throw with a numeric `status` (e.g. an ApiError) so the component can distinguish a terminal
 * 401/403/404 from a transient failure worth retrying.
 */
export type ResolveImageUrl = (imageId: string, variant: ImageVariant) => Promise<string>

const ResolveImageUrlContext = createContext<ResolveImageUrl | null>(null)

export function AuthImageProvider({
  resolveImageUrl,
  children,
}: {
  resolveImageUrl: ResolveImageUrl
  children: ReactNode
}) {
  return <ResolveImageUrlContext.Provider value={resolveImageUrl}>{children}</ResolveImageUrlContext.Provider>
}

export function useResolveImageUrl(): ResolveImageUrl {
  const resolve = useContext(ResolveImageUrlContext)
  if (!resolve) {
    throw new Error('AuthenticatedImage must be used within an <AuthImageProvider>.')
  }
  return resolve
}
