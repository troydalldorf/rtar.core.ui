import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  // React is a peer dep supplied by the consuming app — never bundle it, or the app would run two
  // copies of React. (The lib has no other runtime deps: it's plain HTML/CSS, no UI framework.)
  external: ['react', 'react-dom'],
})
