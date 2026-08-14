import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  // Peer deps supplied by the consuming app — never bundle them. Two copies of React breaks hooks
  // outright; two copies of the markdown pipeline just doubles the bundle for no benefit, since
  // both apps already depend on it directly.
  external: ['react', 'react-dom', 'react-markdown', 'remark-gfm'],
})
