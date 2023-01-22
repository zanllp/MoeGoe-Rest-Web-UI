import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/tts': 'http://localhost:8000',
      '/tts-res-static': 'http://localhost:8000'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  },
  plugins: [vue(),
    Components({
    resolvers: [AntDesignVueResolver()]
  })],

})
