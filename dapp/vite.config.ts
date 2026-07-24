// @ts-nocheck
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/dapp/',
  plugins: [react()],
  optimizeDeps: {
    include: [
      '@solana/kit',
      '@solana-program/memo',
      '@solana-program/system',
      '@solana-program/token',
      '@privy-io/react-auth',
    ],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
})