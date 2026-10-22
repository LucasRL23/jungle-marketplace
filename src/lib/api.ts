import axios from 'axios'
import { QueryClient } from '@tanstack/react-query'
export const api = axios.create({ baseURL: '/api', timeout: 10000 })
export const queryClient = new QueryClient({ defaultOptions: {
  queries: { staleTime: 30000, retry: (count, error) => count < 2 && (!axios.isAxiosError(error) || !error.response || error.response.status >= 500) },
  mutations: { retry: false },
} })
