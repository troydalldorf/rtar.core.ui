# @rtar/core-ui

Shared web UI for the rtar browser apps (Vantage, admin). React, framework-agnostic (plain HTML + CSS).

Consumed as a **git dependency** — no registry. The `prepare` script builds `dist/` on install, so
`npm install` from git yields a ready package.

```jsonc
// package.json in the consuming app
"dependencies": {
  "@rtar/core-ui": "github:troydalldorf/rtar.core.ui#v0.1.0"
}
```

Peer deps (supplied by the app, never bundled): `react`, `react-dom`, `@mui/material`,
`@emotion/react`, `@emotion/styled`.

## AuthenticatedImage

Displays an image the API serves behind Bearer auth. It resolves the image to a **signed URL** (via
an app-supplied resolver) and renders a plain `<img src>` — which, unlike a `fetch` of the redirect
endpoint, is never blocked by CORS. Skeleton while loading, "Unavailable" tile on terminal failure,
transient-retry with backoff, in-memory URL cache with concurrent-dedupe.

> **Why a signed-URL resolver, not fetch→blob?** In a browser, fetching `/images/{id}/redirect` and
> reading the blob fails: following the cross-origin 302 to object storage makes the request `Origin`
> `null`, which storage won't satisfy even with `Access-Control-Allow-Origin: *`. An `<img>` only
> *displays* (never *reads pixels*), so it isn't subject to CORS. Native apps (Capacitor) don't hit
> this and can keep using the blob path — hence the resolver seam.

### Wire it once, per app

```tsx
import { AuthImageProvider } from '@rtar/core-ui'

// The only app-specific part: how to turn an image id into a displayable URL.
const resolveImageUrl = async (imageId: string, variant: 'thumb' | 'preview' | 'full') => {
  const token = await getAccessToken()
  const res = await fetch(`${API_BASE}/images/${imageId}/url?variant=${variant}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw Object.assign(new Error(`Image ${res.status}`), { status: res.status })
  return (res.json() as Promise<{ url: string }>).then((d) => d.url)
}

<AuthImageProvider resolveImageUrl={resolveImageUrl}>{app}</AuthImageProvider>
```

Then anywhere:

```tsx
import { AuthenticatedImage } from '@rtar/core-ui'

<AuthenticatedImage imageId={id} variant="thumb" size={120} onClick={() => openLightbox(id)} />
```

Call `clearImageCache()` on logout / signed-in-user change.
