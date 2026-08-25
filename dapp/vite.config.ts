// @ts-nocheck
/**
 * PAWLY dApp vite.config — 25.08.2026 v7.7.8 Buffer for iOS/Android wallet WebView
 * 若线上路径是 /dapp/，保留 base: '/dapp/'
 * 必须: npm i buffer
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // 正式站若挂在 https://www.pawlypets.online/dapp/ 则用 '/dapp/'；根路径部署改 '/'
  base: "/dapp/",
  plugins: [react()],
  define: {
    global: "globalThis",
  },
  resolve: {
    alias: {
      buffer: "buffer/",
    },
  },
  optimizeDeps: {
    include: [
      "buffer",
      "@solana/web3.js",
      "@solana/spl-token",
      "@privy-io/react-auth",
    ],
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/, /buffer/],
      transformMixedEsModules: true,
    },
  },
  server: {
    allowedHosts: true,
  },
});
