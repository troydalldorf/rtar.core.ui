/**
 * The documentation markdown dialect, client side: the four constructs authored documents add on
 * top of GFM.
 *
 * Kept deliberately in step with `MarkdownDialect` / `DocMarkdown` on the API side, because the two
 * renderers have to agree about what a figure is — a construct that shows on the web and vanishes
 * in the PDF (or the reverse) is the failure this whole shape exists to avoid.
 */

/** URL scheme identifying an image held in the API's `/images` store. */
export const IMAGE_SCHEME = 'rtar-image:'

const OBJECT_ID = /^[0-9a-fA-F]{24}$/

/** The image id behind a `rtar-image:` url, or null for any other url. */
export function readImageId(url: string | undefined): string | null {
  if (!url || !url.toLowerCase().startsWith(IMAGE_SCHEME)) return null
  const candidate = url.slice(IMAGE_SCHEME.length).trim()
  return OBJECT_ID.test(candidate) ? candidate : null
}

/** GitHub alert kinds, mapped to the label a reader actually sees. */
export const ALERT_LABELS: Record<string, string> = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
}

// ---- SVG sanitizing ---------------------------------------------------------------------------

// Allowlist rather than denylist: an unknown element is far more likely to be the next way in than
// something a hand-drawn diagram needed. The API refuses these bodies on write; this is the second
// line, because a document is read far more often than it is republished and an SVG that passed an
// older, weaker check would otherwise stay trusted forever.
const ALLOWED_ELEMENTS = new Set([
  'svg', 'g', 'defs', 'symbol', 'use', 'title', 'desc',
  'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'text', 'tspan', 'textPath',
  'marker', 'clipPath', 'mask', 'pattern',
  'linearGradient', 'radialGradient', 'stop',
])

// Event handlers, in any casing. `opacity` and friends are safe from this because it requires an
// `n` — but the pattern is explicit rather than a startsWith so that stays obvious.
const EVENT_HANDLER = /^on[a-z]+$/i

/**
 * Returns sanitized SVG markup, or null when the source is not a usable standalone SVG. Never
 * throws: a malformed diagram costs one figure, not the page.
 */
export function sanitizeSvg(source: string): string | null {
  if (typeof DOMParser === 'undefined') return null

  let parsed: Document
  try {
    parsed = new DOMParser().parseFromString(source, 'image/svg+xml')
  } catch {
    return null
  }

  if (parsed.getElementsByTagName('parsererror').length > 0) return null

  const root = parsed.documentElement
  if (!root || root.nodeName.toLowerCase() !== 'svg') return null

  if (!scrub(root)) return null

  try {
    return new XMLSerializer().serializeToString(root)
  } catch {
    return null
  }
}

/** Strips disallowed elements and attributes in place. Returns false if the root itself is invalid. */
function scrub(element: Element): boolean {
  for (const attribute of Array.from(element.attributes)) {
    if (!isAttributeAllowed(attribute.name, attribute.value)) {
      element.removeAttribute(attribute.name)
    }
  }

  for (const child of Array.from(element.childNodes)) {
    // Anything that is not an element or plain text goes. A CDATA section survives serialization
    // verbatim and is then re-parsed as HTML, which is enough to break out of foreign content:
    // `<desc><![CDATA[><img src=x onerror=…>]]></desc>`. Comments and processing instructions are
    // dropped for the same reason — they carry no diagram and are a re-parse hazard.
    if (child.nodeType === 8 /* COMMENT_NODE */
      || child.nodeType === 4 /* CDATA_SECTION_NODE */
      || child.nodeType === 7 /* PROCESSING_INSTRUCTION_NODE */) {
      child.parentNode?.removeChild(child)
      continue
    }

    if (child.nodeType !== 1 /* ELEMENT_NODE */) continue

    const el = child as Element
    const name = el.nodeName.replace(/^.*:/, '')
    if (!ALLOWED_ELEMENTS.has(name) && !ALLOWED_ELEMENTS.has(name.toLowerCase())) {
      el.remove()
      continue
    }
    scrub(el)
  }

  return true
}

function isAttributeAllowed(name: string, value: string): boolean {
  const lower = name.toLowerCase()

  if (EVENT_HANDLER.test(lower)) return false

  // References may only point inside the document. Anything off-origin would leak the reader's IP
  // to whoever authored the doc, quite apart from what it could load.
  if (lower === 'href' || lower.endsWith(':href') || lower === 'src') {
    return value.trim().startsWith('#')
  }

  // url(...) in a presentation attribute has the same reach as href.
  if (/url\(\s*['"]?(?!#)/i.test(value)) return false
  if (/javascript:/i.test(value)) return false

  return true
}

// ---- Heading anchors --------------------------------------------------------------------------

/**
 * The id given to a single heading. Unicode-aware: the ASCII-only class this started with produced
 * an empty id for a CJK heading, so every such heading collided on `id=""`.
 */
export function slugifyHeading(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\- ]+/gu, '')
    .trim()
    .replace(/\s+/g, '-')

  return slug.length > 0 ? slug : 'section'
}

/**
 * A slugger for one document. Repeats get a numeric suffix, matching github-slugger — two
 * `## Overview` headings become `overview` and `overview-1` rather than two elements sharing an id,
 * which silently broke the second one's anchor.
 *
 * Both the renderer and anything building a contents rail must run one of these over the SAME
 * sequence of headings, or their counters diverge and the links stop landing.
 */
export function createHeadingSlugger(): (text: string) => string {
  const seen = new Map<string, number>()

  return (text: string) => {
    const base = slugifyHeading(text)
    const used = seen.get(base) ?? 0
    seen.set(base, used + 1)
    return used === 0 ? base : `${base}-${used}`
  }
}
