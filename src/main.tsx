import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/api";
import "@fontsource-variable/roboto-mono";
import "./index.css";
import "./kurio.css";
async function start() {
  if (import.meta.env.VITE_MOCKS !== "false") {
    const { worker } = await import("./mocks/browser");

    await worker.start();
  }
  // Engine.IO captures WebSocket when imported. Load the app only after MSW
  // installs its interceptor, so Socket.IO uses the mocked network transport.
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
