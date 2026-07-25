import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  // React and MUI are peer deps supplied by the consuming app — never bundle them, or the app
  // would run two copies of React.
  external: ['react', 'react-dom', '@mui/material', '@emotion/react', '@emotion/styled'],
})
