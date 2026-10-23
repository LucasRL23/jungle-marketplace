import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/api";
import { mockStartup } from "./lib/mock-ready";
import "@fontsource-variable/roboto-mono";
import "./index.css";
import "./kurio.css";
async function enableMocks() {
  if (import.meta.env.VITE_MOCKS !== "false") {
    const { worker } = await import("./mocks/browser");

    await worker.start();
  }
}
void enableMocks().then(mockStartup.resolve, mockStartup.reject);
async function start() {
  // Render the shell immediately; Axios and the Socket.IO module await MSW.
  const { default: App } = await import("./App");
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  );
}
void start();
