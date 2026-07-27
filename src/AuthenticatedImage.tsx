import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useResolveImageUrl, type ImageVariant } from './authImageContext'
import { evictCachedImageUrl, getCachedImageUrl } from './imageUrlCache'

export interface AuthenticatedImageProps {
  imageId: string
  variant?: ImageVariant
  alt?: string
  /** Fixed square size (px) for the thumbnail/skeleton. Ignored when `fill` is set. */
  size?: number
  /** Fill the parent (100% × 100%) instead of a fixed square — the parent must be sized. */
  fill?: boolean
  onClick?: () => void
  className?: string
  /** Extra inline styles merged onto the rendered element (img / placeholder). */
  style?: CSSProperties
}

// Backoff for transient failures (network / 5xx). A 401/403/404 is treated as terminal — no retry.
const RETRY_DELAYS_MS = [1500, 4000]

function isTerminalStatus(status: number | undefined): boolean {
  return status === 401 || status === 403 || status === 404
}

// Injected once. A plain-CSS shimmer so the lib has NO UI-framework dependency (it's consumed by
// both a MUI app and a non-MUI one).
const SHIMMER_STYLE_ID = 'rtar-authimg-shimmer'
function ensureShimmerStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(SHIMMER_STYLE_ID)) return
  const el = document.createElement('style')
  el.id = SHIMMER_STYLE_ID
  el.textContent = `
@keyframes rtar-authimg-shimmer { from { background-position: 200% 0 } to { background-position: -200% 0 } }
.rtar-authimg-shimmer {
  background: linear-gradient(90deg, rgba(127,127,127,0.10) 0%, rgba(127,127,127,0.22) 50%, rgba(127,127,127,0.10) 100%);
  background-size: 200% 100%;
  animation: rtar-authimg-shimmer 1.4s linear infinite;
}
.rtar-authimg-unavailable {
  display: flex; align-items: center; justify-content: center; padding: 4px;
  font-size: 11px; text-align: center; color: rgba(127,127,127,0.9);
  border: 1px solid rgba(127,127,127,0.25); box-sizing: border-box;
}`
  document.head.appendChild(el)
}

/**
 * Displays an image the API serves behind Bearer auth, resolved to a signed URL via the app-supplied
 * {@link AuthImageProvider} and rendered with a plain `<img src>` — which, unlike a fetch of the
 * redirect endpoint, is never blocked by CORS. Shows a shimmer while resolving and an "Unavailable"
 * tile on terminal failure so the layout never collapses; retries transient failures with backoff.
 *
 * Framework-agnostic: plain HTML + CSS, no UI-library dependency.
 */
export function AuthenticatedImage({ imageId, variant = 'thumb', alt = '', size = 120, fill, onClick, className, style }: AuthenticatedImageProps) {
  const resolveImageUrl = useResolveImageUrl()

  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const timer = useRef<number | null>(null)

  useEffect(() => ensureShimmerStyles(), [])

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

  const box: CSSProperties = fill
    ? { width: '100%', height: '100%' }
    : { width: size, height: size, borderRadius: 8, overflow: 'hidden' }

  if (failed) {
    return <div className={`rtar-authimg-unavailable ${className ?? ''}`} style={{ ...box, borderRadius: 8, ...style }}>Unavailable</div>
  }

  if (!url) {
    return <div className={`rtar-authimg-shimmer ${className ?? ''}`} style={{ ...box, borderRadius: 8, ...style }} aria-busy="true" aria-label={alt || undefined} />
  }

  return (
    <img
      className={className}
      src={url}
      alt={alt}
      onError={handleImgError}
      onClick={onClick}
      loading="lazy"
      style={{ ...box, objectFit: fill ? 'contain' : 'cover', display: 'block', cursor: onClick ? 'pointer' : 'default', ...style }}
    />
  )
}
