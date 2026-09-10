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
 * - a paragraph containing nothing but SEVERAL images becomes a row of captioned frames
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

/**
 * A paragraph that is nothing but images.
 *
 * One image is a figure, as it always was. SEVERAL are a row — a set meant to be read across rather
 * than scrolled through, which is what a screen at five widths, or a before and after, actually is.
 *
 * No new syntax carries that: the author writes the images on their own lines, and the soft breaks
 * between them are already what `applyFigure` had to skip to recognise a lone image at all. A fence
 * would have meant literal text and a second parser for something mdast has already given us, and it
 * would render as a block of markup in any other markdown tool. This degrades to the same images in
 * the same order, merely stacked.
 */
function applyFigure(paragraph: Node): void {
  // Soft breaks and the whitespace either side of them are what separate the images in the source;
  // anything else means the paragraph is prose that happens to contain one.
  const kept = (paragraph.children ?? []).filter(
    (child) =>
      !(child.type === 'break' || (child.type === 'text' && (child.value ?? '').trim().length === 0)),
  )
  if (kept.length === 0 || kept.some((child) => child.type !== 'image')) return

  if (kept.length === 1) {
    applySingleFigure(paragraph, kept[0])
    return
  }

  // Each frame carries its own caption, because in a row the caption identifies WHICH one this is —
  // the width, the state, the before or the after — rather than describing the set.
  paragraph.data = { hName: 'div', hProperties: { className: ['doc-figure-row'] } }
  paragraph.children = kept.map((image) => ({
    type: 'paragraph',
    data: { hName: 'figure', hProperties: { className: ['doc-frame'] } },
    children: captioned(image),
  }))
}

function applySingleFigure(paragraph: Node, image: Node): void {
  paragraph.data = { hName: 'figure', hProperties: { className: ['doc-figure'] } }
  paragraph.children = captioned(image)
}

/** An image, followed by its alt as a caption where there is one. */
function captioned(image: Node): Node[] {
  const caption = (image.alt ?? '').trim()
  if (caption.length === 0) return [image]
  return [
    image,
    { type: 'paragraph', data: { hName: 'figcaption' }, children: [{ type: 'text', value: caption }] },
  ]
}
