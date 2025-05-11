// vite.config.js
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  // --- 添加 server 配置 ---
  server: {
    host: true // 允许 Vite 监听所有网络接口 (包括你的局域网 IP)
    // 如果你需要指定端口（默认是 5173），可以取消下面一行的注释
    // port: 5173,
  }
  // --- 添加结束 ---
})