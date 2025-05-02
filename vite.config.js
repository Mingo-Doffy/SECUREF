import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: "/SECUREF/",
  plugins: [react({
    jsxRuntime: 'classic' // Ajout de cette ligne pour résoudre le problème
  })],
  optimizeDeps: {
    include: [
      '@mui/material',
      '@mui/icons-material',
      'react-chartjs-2',
      'chart.js'
    ]
  }
})