import axios from "axios";
import { QueryClient } from "@tanstack/react-query";
import type { Session } from "../domain";
export const api = axios.create({ baseURL: "/api", timeout: 10000 });
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: (count, error) =>
        count < 2 &&
        (!axios.isAxiosError(error) ||
          !error.response ||
          error.response.status >= 500),
    },
    mutations: { retry: false },
  },
});
const visitor = localStorage.getItem("jungle-visitor") || crypto.randomUUID();
localStorage.setItem("jungle-visitor", visitor);
api.interceptors.request.use((config) => {
  config.headers.set("X-Visitor", visitor);
  const token = localStorage.getItem("jungle-token");
  if (token && !config.headers.has("Authorization"))
    config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});
export async function clearPrivateData() {
  window.dispatchEvent(new Event("jungle-session-reset"));
  await queryClient.cancelQueries({
    predicate: (q) => q.queryKey[0] === "private",
  });
  queryClient.removeQueries({ predicate: (q) => q.queryKey[0] === "private" });
}
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      error.config?.headers.get("Authorization") ===
        `Bearer ${localStorage.getItem("jungle-token")}`
    ) {
      localStorage.removeItem("jungle-token");
      await clearPrivateData();
      queryClient.setQueryData(["session"], null);
      window.dispatchEvent(new Event("jungle-session-expired"));
    }
    return Promise.reject(error);
  },
);
export const sessionOptions = {
  queryKey: ["session"] as const,
  queryFn: async ({ signal }: { signal: AbortSignal }) =>
    (await api.get<Session | null>("/session", { signal })).data,
  retry: false,
  staleTime: 0,
};
export function errorMessage(error: unknown) {
  return axios.isAxiosError(error)
    ? error.response?.data?.message ||
        (error.code === "ECONNABORTED"
          ? "A resposta demorou. Você pode tentar novamente com segurança."
          : "Falha de conexão. Tente novamente.")
    : "Não foi possível concluir a operação.";
}
