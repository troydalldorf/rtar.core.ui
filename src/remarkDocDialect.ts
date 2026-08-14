import { ALERT_LABELS, createHeadingSlugger } from './docDialect'

/**
 * Minimal mdast shapes. Typed locally rather than pulling in `@types/mdast` — the plugin touches
 * three node kinds and the dependency would be larger than the plugin.
 */
interface Node {
  type: string
  value?: string
  alt?: string | null
  url?: string
  depth?: number
  children?: Node[]
  data?: { hName?: string; hProperties?: Record<string, unknown> }
}

const ALERT_MARKER = /^\s*\[!([A-Za-z]+)\]\s*\n?/

/**
 * Rewrites the two constructs that are structural rather than presentational, so the React
 * components downstream stay simple:
 *
 * - a blockquote opening with `[!NOTE]` becomes an `aside` callout carrying its label
 * - a paragraph containing nothing but an image becomes a `figure` with the alt text as its caption
 * - every heading gets a stable, de-duplicated anchor id
 *
 * Diagrams (` ```svg `) are deliberately left alone — they need sanitizing at render time, which is
 * a DOM job, not an AST one. Page-break comments are HTML, which react-markdown drops on its own;
 * they exist for print and are correctly invisible here.
 */
export function remarkDocDialect() {
  return (tree: Node) => {
    // One slugger per document, walked in document order — that ordering is the contract a
    // contents rail has to reproduce for its links to land on the right heading.
    walk(tree, createHeadingSlugger())
  }
}

function walk(node: Node, slug: (text: string) => string): void {
  if (!node.children) return

  for (const child of node.children) {
    if (child.type === 'blockquote') applyAlert(child)
    else if (child.type === 'paragraph') applyFigure(child)
    else if (child.type === 'heading') applyHeadingId(child, slug)
    walk(child, slug)
  }
}

function applyHeadingId(heading: Node, slug: (text: string) => string): void {
  heading.data = {
    ...heading.data,
    hProperties: { ...heading.data?.hProperties, id: slug(plainText(heading)) },
  }
}

/** The visible text of an inline subtree — emphasis and links contribute their content. */
function plainText(node: Node): string {
  if (typeof node.value === 'string') return node.value
  return (node.children ?? []).map(plainText).join('')
}

function applyAlert(quote: Node): void {
  const paragraph = quote.children?.[0]
  if (!paragraph || paragraph.type !== 'paragraph') return

  const first = paragraph.children?.[0]
  if (!first || first.type !== 'text' || typeof first.value !== 'string') return

  const match = ALERT_MARKER.exec(first.value)
  if (!match) return

  const kind = match[1].toLowerCase()
  const label = ALERT_LABELS[kind]
  if (!label) return

  // Strip the marker; drop the paragraph entirely if it held nothing else, which is the standard
  // form (`> [!NOTE]` alone on its line) and would otherwise open the callout with a blank line.
  first.value = first.value.slice(match[0].length)
  if (first.value.length === 0 && paragraph.children?.length === 1) {
    quote.children = quote.children?.slice(1)
  }

  quote.data = {
    hName: 'aside',
    hProperties: {
      className: ['doc-callout', `doc-callout--${kind}`],
      'data-doc-label': label,
    },
  }
}

function applyFigure(paragraph: Node): void {
  const children = paragraph.children ?? []
  const image = children[0]
  if (children.length !== 1 || !image || image.type !== 'image') return

  paragraph.data = { hName: 'figure', hProperties: { className: ['doc-figure'] } }

  const caption = (image.alt ?? '').trim()
  if (caption.length > 0) {
    paragraph.children = [
      image,
      { type: 'paragraph', data: { hName: 'figcaption' }, children: [{ type: 'text', value: caption }] },
    ]
  }
}
