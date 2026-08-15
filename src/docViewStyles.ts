/**
 * The document stylesheet, injected once — the same runtime-injection approach
 * `AuthenticatedImage` uses, so the library stays free of a CSS import that every consuming
 * bundler would have to be taught about.
 *
 * This is where the "reads like a typeset document" quality lives: a measure that tops out around
 * 68 characters, a real type scale, generous vertical rhythm, and captions and callouts that are
 * set apart rather than merely indented. Storing plain markdown costs nothing here — the look is a
 * stylesheet, not a storage format.
 */
const STYLE_ID = 'rtar-docview-styles'

export function ensureDocViewStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return

  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = CSS
  document.head.appendChild(el)
}

const CSS = `
.doc-view {
  --doc-fg: #1f2328;
  --doc-fg-muted: #656d76;
  --doc-heading: #0d1117;
  --doc-accent: #7a5cff;
  --doc-rule: rgba(127, 127, 127, 0.22);
  --doc-surface: rgba(127, 127, 127, 0.06);
  --doc-code-bg: rgba(127, 127, 127, 0.10);

  --doc-table-border: rgba(127, 127, 127, 0.30);
  --doc-table-head: rgba(127, 127, 127, 0.11);
  --doc-table-stripe: rgba(127, 127, 127, 0.045);

  /* The prose measure, and the wider bound a table or diagram may break out to. Both are lengths
     rather than one max-width on the container, because the container has to be wide enough to
     hold the widest child — see the measure rules below. */
  --doc-measure: 68ch;
  --doc-measure-wide: 104ch;

  --doc-note: #3b7dd8;
  --doc-tip: #2f9e6d;
  --doc-important: #8b5cf6;
  --doc-warning: #d1893a;
  --doc-caution: #d1543a;

  color: var(--doc-fg);
  font-size: 1.0625rem;
  line-height: 1.7;
  max-width: var(--doc-measure-wide);
  overflow-wrap: break-word;
}

/* ---- Measure ----

   The measure is capped per CHILD, not on .doc-view, so that running text keeps its ~68ch line while
   a table or a diagram can break out to the wider bound. Capping the container instead — what this
   did before — squeezed a four-column table into the prose column and handed it a scrollbar, which
   is what made an authored table read as raw markdown.

   Kept in normal block flow on purpose. A grid here would lay out the same children, but adjacent
   margins stop collapsing inside one, and every vertical rhythm value below is written expecting the
   collapse (a 1.15em paragraph bottom meeting a 2.2em heading top is 2.2em, not 3.35em). */
.doc-view > p,
.doc-view > ul,
.doc-view > ol,
.doc-view > blockquote,
.doc-view > .doc-callout { max-width: var(--doc-measure); }

/* Headings span the full width so an h2's rule reads as a section divider across the widest content
   under it, rather than stopping short above a table. Heading text is short enough not to need the
   measure to stay readable. */

/* Deliberately NOT keyed to prefers-color-scheme. The document sets a foreground colour but paints
   no background of its own — it sits on whatever surface the host app provides — so following the OS
   instead of the host produces near-white text on a light panel the moment the two disagree. Both
   consuming apps are dark, and both say so explicitly. */
.doc-view[data-doc-theme="dark"] {
  --doc-fg: #e6edf3;
  --doc-fg-muted: #9198a1;
  --doc-heading: #f0f6fc;
  --doc-accent: #a78bfa;
}

.doc-view > :first-child { margin-top: 0; }
.doc-view > :last-child { margin-bottom: 0; }

.doc-view h1, .doc-view h2, .doc-view h3, .doc-view h4 {
  color: var(--doc-heading);
  font-weight: 600;
  line-height: 1.25;
  margin: 0 0 0.6em;
  scroll-margin-top: 5rem;
}
.doc-view h1 { font-size: 1.95em; letter-spacing: -0.02em; }
.doc-view h2 {
  font-size: 1.35em;
  letter-spacing: -0.01em;
  margin-top: 2.2em;
  padding-top: 0.9em;
  border-top: 1px solid var(--doc-rule);
}
.doc-view h3 { font-size: 1.1em; margin-top: 1.8em; }
.doc-view h4 { font-size: 1em; margin-top: 1.5em; color: var(--doc-fg); }

.doc-view p { margin: 0 0 1.15em; }

.doc-view a {
  color: var(--doc-accent);
  text-decoration: underline;
  text-underline-offset: 0.15em;
  text-decoration-thickness: 1px;
}

.doc-view ul, .doc-view ol { margin: 0 0 1.15em; padding-left: 1.4em; }
.doc-view li { margin: 0.35em 0; }
.doc-view li > ul, .doc-view li > ol { margin-bottom: 0; }

.doc-view blockquote {
  margin: 1.4em 0;
  padding: 0.1em 0 0.1em 1.1em;
  border-left: 2px solid var(--doc-rule);
  color: var(--doc-fg-muted);
}

.doc-view hr { border: 0; border-top: 1px solid var(--doc-rule); margin: 2.4em 0; }

/* ---- Callouts ---- */

.doc-callout {
  display: block;
  margin: 1.5em 0;
  padding: 0.9em 1.1em;
  border-left: 3px solid var(--doc-callout-accent, var(--doc-accent));
  border-radius: 0 6px 6px 0;
  background: var(--doc-surface);
}
.doc-callout > :last-child { margin-bottom: 0; }
.doc-callout--note { --doc-callout-accent: var(--doc-note); }
.doc-callout--tip { --doc-callout-accent: var(--doc-tip); }
.doc-callout--important { --doc-callout-accent: var(--doc-important); }
.doc-callout--warning { --doc-callout-accent: var(--doc-warning); }
.doc-callout--caution { --doc-callout-accent: var(--doc-caution); }

.doc-callout__label {
  display: block;
  margin: 0 0 0.4em;
  font-size: 0.78em;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--doc-callout-accent, var(--doc-accent));
}

/* ---- Figures and diagrams ---- */

.doc-figure { margin: 2em 0; text-align: center; }
.doc-figure img { max-width: 100%; height: auto; border-radius: 6px; }
.doc-figure figcaption {
  margin: 0.7em 0 0;
  font-size: 0.86em;
  color: var(--doc-fg-muted);
}

.doc-diagram { margin: 2em 0; text-align: center; overflow-x: auto; }
.doc-diagram svg { max-width: 100%; height: auto; }

.doc-unavailable {
  display: block;
  margin: 2em 0;
  padding: 1.2em;
  border: 1px dashed var(--doc-rule);
  border-radius: 6px;
  text-align: center;
  font-size: 0.9em;
  font-style: italic;
  color: var(--doc-fg-muted);
}

/* ---- Code ---- */

.doc-view code {
  padding: 0.15em 0.4em;
  border-radius: 4px;
  background: var(--doc-code-bg);
  font-size: 0.88em;
}
.doc-view pre {
  margin: 1.5em 0;
  padding: 1em 1.1em;
  border-radius: 8px;
  background: var(--doc-code-bg);
  overflow-x: auto;
  line-height: 1.55;
}
.doc-view pre code { padding: 0; background: none; font-size: 0.86em; }

/* ---- Tables ---- */

/* The scroller is also the frame. Bounding the table in a rounded, bordered container is what makes
   it read as one object; before, a table was a stack of loose horizontal rules with nothing holding
   it together, and its right edge simply ran out. overflow-x stays, for the genuinely too-wide
   table on a narrow viewport. */
.doc-table-scroll {
  margin: 1.9em 0;
  overflow-x: auto;
  border: 1px solid var(--doc-table-border);
  border-radius: 10px;
}
.doc-view table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92em;
  font-variant-numeric: tabular-nums;
}

.doc-view thead th {
  padding: 0.72em 0.95em;
  font-size: 0.76em;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  text-align: left;
  white-space: nowrap;
  color: var(--doc-fg-muted);
  background: var(--doc-table-head);
  border-bottom: 1px solid var(--doc-table-border);
}

.doc-view td {
  padding: 0.75em 0.95em;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid var(--doc-rule);
}
.doc-view tbody tr:nth-child(even) td { background: var(--doc-table-stripe); }
.doc-view tbody tr:last-child td { border-bottom: 0; }

/* The left column is the row's subject in every table shape the dialect produces — a term being
   defined, a hostname, a field name — so it carries heading colour and stops wrapping mid-token. */
.doc-view tbody td:first-child { color: var(--doc-heading); }
.doc-view td code { overflow-wrap: break-word; }
`
