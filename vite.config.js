import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base =
  process.env.GITHUB_ACTIONS === 'true' && repositoryName
    ? `/${repositoryName}/`
    : '/'

const nominatimProxy = {
  target: 'https://nominatim.openstreetmap.org',
  changeOrigin: true,
  rewrite: (path) => path.replace(/^\/api\/nominatim/, ''),
  headers: {
    'User-Agent': 'QuickCart/1.0 (Walmart store finder)',
  },
}

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
  server: {
    proxy: {
      '/api/nominatim': nominatimProxy,
    },
  },
  preview: {
    proxy: {
      '/api/nominatim': nominatimProxy,
    },
  },
})
