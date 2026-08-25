/**
 * PAWLY dApp entry — 25.08.2026 v7.7.8
 * Buffer 必须在 import App 之前注入，否则 iOS/Android 钱包 WebView 报:
 *   Can't find variable: Buffer
 * 同时执行: npm i buffer
 */
import { Buffer } from "buffer";

const g: any =
  typeof globalThis !== "undefined"
    ? globalThis
    : typeof window !== "undefined"
      ? window
      : undefined;
if (g) {
  if (!g.Buffer) g.Buffer = Buffer;
}
if (typeof window !== "undefined" && !(window as any).Buffer) {
  (window as any).Buffer = Buffer;
}
if (typeof globalThis !== "undefined" && typeof (globalThis as any).process === "undefined") {
  (globalThis as any).process = {
    env: {},
    browser: true,
    version: "",
    nextTick: (fn: () => void) => setTimeout(fn, 0),
  };
}

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const rootElement = document.getElementById("root")!;
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
