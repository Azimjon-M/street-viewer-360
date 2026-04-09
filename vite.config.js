import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(() => {

  return {
    plugins: [
      react(),
    ],
    assetsInclude: ['**/*.jpg', '**/*.jpeg', '**/*.png', '**/*.webp'],
    build: {
      assetsInlineLimit: 0, // Hech qachon inline qilmasin (katta rasmlar uchun)
      chunkSizeWarningLimit: 10000, // 10MB gacha warning chiqarmaydi
    },
    server: {
      host: true, // barcha tarmoqlarda ochiq bo'ladi (localhost, 10.0.*.* va 192.168.137.1), xato bermaydi.
      port: 5173, // o'zingiz hohlagan port shu yerda turadi
      strictPort: true, // port band bo'lib qolsa yana o'tib ketmasligini taminlaydi
      fs: {
        strict: false,
      },
    },
  }
})
