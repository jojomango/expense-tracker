import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages 部署路徑。CI 會以 VITE_BASE 覆寫成 /<repo-name>/
// 本機開發時為 '/'，不受影響。
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    // SPEC.md §6 Phase 7：PWA manifest + service worker，Android Chrome
    // 可「加到主畫面」；離線時既有資料仍可讀寫（P3：純本地零網路）。
    // `injectRegister: 'auto'` 會自動在建置產物內註冊 SW，不需要手動寫
    // `navigator.serviceWorker.register(...)`。圖示由 scripts/generate-icons.mjs
    // 產生並 self-host 在 public/icons/，manifest 內只引用相對路徑（自動套用 base）。
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: '記帳本',
        short_name: '記帳本',
        description: '純本地、離線可用的個人記帳 App',
        lang: 'zh-Hant',
        start_url: '.',
        display: 'standalone',
        background_color: '#f8fafc',
        theme_color: '#0f172a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 純本地 app：把所有建置產物都預先快取，離線時完全不需要網路。
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: 'index.html',
        // 新 SW 裝好立刻接管現有分頁，離線（飛航模式）才不需要使用者先手動
        // 重新整理兩次才吃得到快取——這對「重新開啟 app 就要能離線用」很關鍵。
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
})
