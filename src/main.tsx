import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/api'
import './index.css'
import App from './App'
async function start() {
  if (import.meta.env.VITE_MOCKS !== 'false') {
    const {worker}=await import('./mocks/browser')
    await worker.start()
  }
  createRoot(document.getElementById('root')!).render(<StrictMode><QueryClientProvider client={queryClient}><App/></QueryClientProvider></StrictMode>)
}
void start()

