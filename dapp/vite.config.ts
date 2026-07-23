// @ts-nocheck
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/dapp/',          // ← 关键：让它能在 /dapp 路径下运行
  plugins: [react()],
})
