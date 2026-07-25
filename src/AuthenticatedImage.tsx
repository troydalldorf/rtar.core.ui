import { useEffect, useRef, useState } from 'react'
import { Box, Skeleton, Typography } from '@mui/material'
import { useResolveImageUrl, type ImageVariant } from './authImageContext'
import { evictCachedImageUrl, getCachedImageUrl } from './imageUrlCache'

export interface AuthenticatedImageProps {
  imageId: string
  variant?: ImageVariant
  alt?: string
  /** Fixed square size (px) for the thumbnail/skeleton. Ignored when `fill` is set. */
  size?: number
  /** Fill the parent instead of a fixed square (e.g. a lightbox). */
  fill?: boolean
  onClick?: () => void
  className?: string
}

// Backoff for transient failures (network / 5xx). A 401/403/404 is treated as terminal — no retry.
const RETRY_DELAYS_MS = [1500, 4000]

function isTerminalStatus(status: number | undefined): boolean {
  return status === 401 || status === 403 || status === 404
}

/**
 * Displays an image the API serves behind Bearer auth, resolved to a signed URL via the app-supplied
 * {@link AuthImageProvider} and rendered with a plain `<img src>` — which, unlike a fetch of the
 * redirect endpoint, is never blocked by CORS. Shows a skeleton while resolving and an "Unavailable"
 * tile on terminal failure so the layout never collapses; retries transient failures with backoff.
 */
export function AuthenticatedImage({ imageId, variant = 'thumb', alt = '', size = 120, fill, onClick, className }: AuthenticatedImageProps) {
  const resolveImageUrl = useResolveImageUrl()

  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setFailed(false)
    getCachedImageUrl(imageId, variant, resolveImageUrl)
      .then((resolved) => {
        if (!cancelled) setUrl(resolved)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const status = (err as { status?: number })?.status
        if (!isTerminalStatus(status) && attempt < RETRY_DELAYS_MS.length) {
          timer.current = window.setTimeout(() => !cancelled && setAttempt((a) => a + 1), RETRY_DELAYS_MS[attempt])
        } else {
          setFailed(true)
        }
      })
    return () => {
      cancelled = true
      if (timer.current !== null) window.clearTimeout(timer.current)
    }
  }, [imageId, variant, resolveImageUrl, attempt])

  // A decoded <img> that then errors means the signed URL expired or was revoked — re-resolve once.
  const handleImgError = () => {
    if (attempt === 0) {
      evictCachedImageUrl(imageId, variant)
      setUrl(null)
      setAttempt(1)
    } else {
      setFailed(true)
    }
  }

  const box = fill ? { width: '100%', height: '100%' } : { width: size, height: size, borderRadius: 2, overflow: 'hidden' }

  if (failed) {
    return (
      <Box
        className={className}
        sx={{ ...box, border: (t) => `1px solid ${t.palette.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'center', px: 1 }}
      >
        <Typography variant="caption" color="text.secondary" align="center">
          Unavailable
        </Typography>
      </Box>
    )
  }

  if (!url) {
    return <Skeleton className={className} variant="rounded" width={fill ? '100%' : size} height={fill ? '100%' : size} />
  }

  return (
    <Box
      component="img"
      className={className}
      src={url}
      alt={alt}
      onError={handleImgError}
      onClick={onClick}
      loading="lazy"
      sx={{
        ...box,
        objectFit: fill ? 'contain' : 'cover',
        display: 'block',
        cursor: onClick ? 'pointer' : 'default',
        border: fill ? 'none' : (t) => `1px solid ${t.palette.divider}`,
      }}
    />
  )
}
