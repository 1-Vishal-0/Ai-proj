import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { isBrowserKey } from './src/services/supabaseBrowserKey.ts'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  for (const [name, value] of Object.entries(env)) {
    if (name.startsWith('VITE_SUPABASE_') && /SECRET|SERVICE.ROLE/.test(name)) {
      throw new Error('Remove private Supabase credentials from all VITE_ environment variables.')
    }
    if (['VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY'].includes(name) &&
        value && value !== 'your-publishable-key-here' && !isBrowserKey(value)) {
      throw new Error(`${name} must contain a Supabase publishable or legacy anon key.`)
    }
  }
<<<<<<< HEAD
  return {
    plugins: [react()],
    cacheDir: `node_modules/.vite/${env.VITE_PORTAL_MODE === 'demo' ? 'demo' : 'portal'}`,
    resolve: { dedupe: ['react', 'react-dom'] },
    optimizeDeps: { include: ['react', 'react-dom/client', 'react-router-dom', 'recharts'] },
  }
=======
  return { plugins: [react()] }
>>>>>>> 83771e38dd27fbe3350e9fcc5c15369f2381ab71
})
