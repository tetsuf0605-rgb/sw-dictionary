import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages のサブパス（https://<user>.github.io/sw-dictionary/）で配信するため base を付ける。
// manifest の start_url / scope は相対パスにして、どのサブパスでも壊れないようにする。
export default defineConfig({
  base: '/sw-dictionary/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // 更新は自動適用せず「更新があります」と案内する（docs/01 F-07）
      includeAssets: ['favicon.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'ホロクロン — スター・ウォーズ辞典',
        short_name: 'ホロクロン',
        description: '視聴済み作品の範囲だけを表示する、個人用の非公式スター・ウォーズ辞典',
        lang: 'ja',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // アプリの殻とデータ（db.json）の両方をキャッシュしてオフラインで動かす（docs/01 F-08）
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
