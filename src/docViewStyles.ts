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

  --doc-note: #3b7dd8;
  --doc-tip: #2f9e6d;
  --doc-important: #8b5cf6;
  --doc-warning: #d1893a;
  --doc-caution: #d1543a;

  color: var(--doc-fg);
  font-size: 1.0625rem;
  line-height: 1.7;
  max-width: 68ch;
  overflow-wrap: break-word;
}

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

.doc-table-scroll { margin: 1.6em 0; overflow-x: auto; }
.doc-view table { width: 100%; border-collapse: collapse; font-size: 0.94em; }
.doc-view th, .doc-view td {
  padding: 0.55em 0.75em;
  text-align: left;
  border-bottom: 1px solid var(--doc-rule);
}
.doc-view th { font-weight: 600; color: var(--doc-heading); background: var(--doc-surface); }
.doc-view tbody tr:last-child td { border-bottom: 0; }
`
