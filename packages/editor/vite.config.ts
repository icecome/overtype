import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 经软链引入的库（packages/core）在 dev 下会落到 Vite 的 SPA fallback，
  // 被当作 HTML 返回导致模块加载失败、应用白屏。
  // 用 alias 显式指向库源码，强制纳入 Vite 模块图并正确 transform 为 JS。
  resolve: {
    alias: {
      overtypeplus: fileURLToPath(new URL('../core/src/overtype.js', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
});
