import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/echarts') || id.includes('node_modules/echarts-for-react')) {
            return 'echarts'
          }
          if (id.includes('node_modules/xlsx')) {
            return 'spreadsheet'
          }
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/jspdf-autotable')) {
            return 'report'
          }
          if (id.includes('node_modules/jstat')) {
            return 'stats'
          }
          return undefined
        },
      },
    },
  },
})
