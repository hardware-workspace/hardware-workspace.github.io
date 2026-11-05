import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), {
    name: 'build-commit-marker',
    transformIndexHtml(html) {
      const commit = process.env.GITHUB_SHA || 'local'
      return html.replace('</head>', `    <meta name="build-commit" content="${commit}" />\n  </head>`)
    },
  }],
  build: {
    outDir: 'dist',
  },
})
