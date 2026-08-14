import { useEffect, useMemo, type ComponentPropsWithoutRef, type ElementType, type ReactNode } from 'react'
import ReactMarkdown, { defaultUrlTransform, type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AuthenticatedImage } from './AuthenticatedImage'
import { readImageId, sanitizeSvg } from './docDialect'
import { remarkDocDialect } from './remarkDocDialect'
import { ensureDocViewStyles } from './docViewStyles'

/**
 * The props react-markdown hands a component override: the element's own props plus the hast `node`
 * it came from. `node` must be pulled off before spreading, or it reaches the DOM as an attribute.
 */
type DomProps<T extends ElementType> = ComponentPropsWithoutRef<T> & { node?: unknown }

export interface DocViewProps {
  /** Document body in the doc markdown dialect: GFM plus figures, svg fences, alerts, page breaks. */
  markdown: string
  /**
   * Which palette to use. Defaults to light — the host owns its theme, and the document paints no
   * background of its own, so a dark app must say so rather than have this guess from the OS.
   */
  theme?: 'light' | 'dark'
  className?: string
}

/**
 * Renders an authored document.
 *
 * Deliberately shared between the admin and the customer portal so a reviewer approves exactly what
 * a customer will see. A second copy of this renderer would drift, and the drift would only ever
 * surface after publication.
 */
export function DocView({ markdown, theme, className }: DocViewProps) {
  useEffect(() => ensureDocViewStyles(), [])

  const components = useMemo<Components>(() => ({
    img: DocImage,
    aside: Callout,
    pre: CodeOrDiagram,
    table: ScrollableTable,
  }), [])

  return (
    <div className={`doc-view ${className ?? ''}`} data-doc-theme={theme}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkDocDialect]}
        components={components}
        // react-markdown's defaultUrlTransform blanks any src whose scheme it doesn't recognise,
        // which silently emptied every rtar-image: reference before DocImage ever saw it — figures
        // rendered as broken-image icons. Pass ours through and defer to the default for the rest,
        // so http/https/mailto keep their sanitizing.
        urlTransform={(url) => (readImageId(url) ? url : defaultUrlTransform(url))}
        // Raw HTML arrives as text nodes, not markup, so the dialect's `<!-- pagebreak -->` — which
        // is meant to be invisible on the web and only matter in print — was being printed to the
        // customer verbatim.
        skipHtml
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}

/**
 * A `rtar-image:` reference resolves through the authenticated image pipeline; anything else is a
 * plain `<img>`. The explicit sizing overrides `AuthenticatedImage`'s square default — a document
 * figure is whatever shape it was captured at, not a thumbnail.
 */
function DocImage({ src, alt }: DomProps<'img'>) {
  const url = typeof src === 'string' ? src : undefined
  const imageId = readImageId(url)

  if (!imageId) {
    return <img src={url} alt={alt ?? ''} loading="lazy" />
  }

  return (
    <AuthenticatedImage
      imageId={imageId}
      variant="full"
      alt={alt ?? ''}
      style={{
        width: '100%',
        height: 'auto',
        // Keeps the loading shimmer and the "Unavailable" tile from collapsing to nothing, since
        // both share this style with the resolved image.
        minHeight: 140,
        maxHeight: '70vh',
        objectFit: 'contain',
        borderRadius: 6,
      }}
    />
  )
}

/**
 * The callout the remark plugin produced. The label is a real element rather than a `::before`, so
 * it is selectable, searchable, and read aloud in order.
 */
function Callout({ children, className, node: _node, ...rest }: DomProps<'aside'> & { 'data-doc-label'?: string }) {
  const label = rest['data-doc-label']

  return (
    <aside className={className} {...rest}>
      {label ? <strong className="doc-callout__label">{label}</strong> : null}
      {children}
    </aside>
  )
}

/**
 * An `svg` fence is a diagram; every other fence is a code sample.
 *
 * The markup is sanitized here even though the API refuses unsafe bodies on write. A document is
 * read far more often than it is republished, so an SVG that only ever passed an older version of
 * the server-side check would otherwise be trusted indefinitely.
 */
function CodeOrDiagram({ children, node: _node, ...rest }: DomProps<'pre'>) {
  const code = extractCode(children)

  if (!code || !code.language || code.language.toLowerCase() !== 'svg') {
    return <pre {...rest}>{children}</pre>
  }

  const safe = sanitizeSvg(code.text)
  if (!safe) {
    return <div className="doc-unavailable">Diagram unavailable</div>
  }

  return <div className="doc-diagram" role="img" dangerouslySetInnerHTML={{ __html: safe }} />
}

/** Wide tables scroll inside their own box rather than forcing the whole page sideways. */
function ScrollableTable({ children, node: _node, ...rest }: DomProps<'table'>) {
  return (
    <div className="doc-table-scroll">
      <table {...rest}>{children}</table>
    </div>
  )
}

/**
 * Reads the language and text out of the `<code>` react-markdown nests inside every `<pre>`.
 */
function extractCode(children: ReactNode): { language: string | null; text: string } | null {
  const node = Array.isArray(children) ? children[0] : children
  if (!node || typeof node !== 'object' || !('props' in node)) return null

  const props = (node as { props?: { className?: string; children?: ReactNode } }).props
  if (!props) return null

  const match = /language-([\w-]+)/.exec(props.className ?? '')
  const text = typeof props.children === 'string'
    ? props.children
    : Array.isArray(props.children)
      ? props.children.filter((c): c is string => typeof c === 'string').join('')
      : ''

  return { language: match?.[1] ?? null, text }
}
