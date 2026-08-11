import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 部署路徑。CI 會以 VITE_BASE 覆寫成 /<repo-name>/
// 本機開發時為 '/'，不受影響。
const base = process.env.VITE_BASE ?? '/'

export default defineConfig({
  base,
  plugins: [react()],
})
